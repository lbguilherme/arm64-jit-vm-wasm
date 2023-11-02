import { Cpu } from "./cpu.js";
import { decodeInstruction } from "./decoder.js";
import binaryen from "binaryen";

export interface CompilerCtx {
  cpu: Cpu,
  pc: number,
  builder: binaryen.Module;
  branch(toPc: number, condition?: binaryen.ExpressionRef): void;
  getFuncIndex(pc: number): number;
  allocLocal(type: binaryen.Type): number;
}

export class Compiler {
  #cpu: Cpu;
  funcTable = new WebAssembly.Table({ element: "anyfunc", initial: 1 });
  mappingAddressToFuncIndex = new Map<number, number>();
  freeFuncIndexes: number[] = [0];

  constructor(cpu: Cpu) {
    this.#cpu = cpu;
  }

  #allocNewFuncIndex() {
    let funcIndex = this.freeFuncIndexes.pop();
    if (funcIndex === undefined) {
      funcIndex = this.funcTable.length;
      this.funcTable.grow(this.funcTable.length * 2);
      for (let i = funcIndex + 1; i < this.funcTable.length; ++i) {
        this.freeFuncIndexes.push(i);
      }
    }

    return funcIndex;
  }

  createWasmFunc(func: () => void) {
    const builder = new binaryen.Module();
    builder.addFunctionImport("imported", "env", "func", binaryen.none, binaryen.none);
    builder.addFunction("func", binaryen.none, binaryen.none, [], builder.call("imported", [], binaryen.none));
    builder.addFunctionExport("func", "func");
    const mod = new WebAssembly.Module(builder.emitBinary());
    const instance = new WebAssembly.Instance(mod, { env: { func } });
    return instance.exports.func as () => void;
  }

  compileFunction(entry: number): () => void {
    const timeStart = performance.now();
    const funcName = `pc_${entry.toString(16)}`;
    let funcIndex = this.mappingAddressToFuncIndex.get(entry) ?? this.#allocNewFuncIndex();

    this.mappingAddressToFuncIndex.set(entry, funcIndex);

    const builder = new binaryen.Module();
    builder.addMemoryImport("memory", "env", "memory", true);
    builder.addTableImport("funcTable", "env", "funcTable");

    this.#cpu.importRegisters(builder);

    const relooper = new binaryen.Relooper(builder);

    const pcToCfg = new Map<number, binaryen.RelooperBlockRef>();
    const pendingPcs = [entry];
    const branches: { fromPc: number, toPc: number, condition?: binaryen.ExpressionRef, code?: binaryen.ExpressionRef }[] = [];
    const locals: binaryen.Type[] = [binaryen.i32];
    const freeLocals = new Set<number>();
    const reservedLocals = new Set<number>([0]);

    while (pendingPcs.length) {
      const blockStartPc = pendingPcs.pop()!;
      if (pcToCfg.has(blockStartPc)) {
        continue;
      }

      const body: binaryen.ExpressionRef[] = [];
      let hasBranched = false;

      const ctx: CompilerCtx = {
        cpu: this.#cpu,
        pc: blockStartPc,
        builder,
        branch(toPc, condition) {
          if (hasBranched) {
            throw new Error("Can't branch twice");
          }
          if (condition) {
            console.log(`\t(conditional branch to ${toPc.toString(16)})`);
          }
          branches.push({ fromPc: blockStartPc, toPc, condition });
          pendingPcs.push(toPc);
          if (condition) {
            branches.push({ fromPc: blockStartPc, toPc: ctx.pc + 4 });
            pendingPcs.push(ctx.pc + 4);
          }
          hasBranched = true;
        },
        getFuncIndex: (funcPc) => {
          const existingIndex = this.mappingAddressToFuncIndex.get(funcPc);
          if (existingIndex !== undefined) {
            return existingIndex;
          }

          const stub = this.createWasmFunc(() => this.compileFunction(funcPc)());

          const newFuncIndex = this.#allocNewFuncIndex();
          this.mappingAddressToFuncIndex.set(funcPc, newFuncIndex);
          this.funcTable.set(newFuncIndex, stub);

          return newFuncIndex;
        },
        allocLocal(type) {
          for (const freeLocal of freeLocals) {
            if (locals[freeLocal] === type) {
              freeLocals.delete(freeLocal);
              return freeLocal;
            }
          }
          const id = locals.length;
          locals.push(type);
          return id;
        },
      };

      const op = this.#cpu.memory.get32Aligned(ctx.pc);
      decodeInstruction(op, (instruction, args) => {
        console.log(`${ctx.pc.toString(16).padStart(8, " ")}: ${op.toString(16).padStart(8, "0")}      ${instruction?.asm(args) ?? "???"}`);
        if (!instruction?.jit) {
          console.log("TODO: JIT");
          hasBranched = true;
          return;
        }

        const code = instruction.jit(ctx, args);

        if (typeof code === "number") {
          body.push(code);
        } else if (Array.isArray(code)) {
          body.push(...code);
        }
      });

      for (let i = 0; i < locals.length; ++i) {
        if (reservedLocals.has(i)) {
          continue;
        }
        freeLocals.add(i);
      }

      if (!hasBranched) {
        branches.push({ fromPc: blockStartPc, toPc: ctx.pc + 4 });
        pendingPcs.push(ctx.pc + 4);
      }

      const block = relooper.addBlock(builder.block(null, body));
      pcToCfg.set(blockStartPc, block);
    }

    for (const branch of branches) {
      const fromCfg = pcToCfg.get(branch.fromPc);
      const toCfg = pcToCfg.get(branch.toPc);
      if (!fromCfg || !toCfg) {
        throw new Error("Branch to unknown block");
      }
      relooper.addBranch(fromCfg, toCfg, branch.condition as number, branch.code as number);
    }
    const timeCodegen = performance.now();

    const finalExpr = relooper.renderAndDispose(pcToCfg.get(entry)!, 0);

    builder.addFunction(funcName, binaryen.none, binaryen.none, locals, finalExpr);
    builder.addFunctionExport(funcName, funcName);

    const timeRender = performance.now();

    builder.optimize();

    const timeFinal = performance.now();

    console.log(`Codegen: ${timeCodegen - timeStart}ms`);
    console.log(`Render: ${timeRender - timeCodegen}ms`);
    console.log(`Optimize: ${timeFinal - timeRender}ms`);

    console.log(builder.emitText());

    const mod = new WebAssembly.Module(builder.emitBinary());
    const instance = new WebAssembly.Instance(mod, {
      env: {
        memory: this.#cpu.memory.wasmMemory,
        funcTable: this.funcTable
      },
      registers: this.#cpu.registers as unknown as Record<string, WebAssembly.Global>,
    });

    const func = instance.exports[funcName] as () => void;

    this.funcTable.set(funcIndex, func);

    return func;
  }
}
