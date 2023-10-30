import { Cpu } from "./cpu.js";
import { decoder } from "./decoder.js";
import binaryen from "binaryen";

export interface CompilerCtx {
  cpu: Cpu,
  pc: number,
  builder: binaryen.Module;
  emit(code: binaryen.ExpressionRef): void;
  branch(toPc: number, condition?: binaryen.ExpressionRef, code?: binaryen.ExpressionRef): void;
  getFuncIndex(pc: number): number;
  allocLocal(type: binaryen.Type): number;
  freeLocal(id: number): void;
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
    const funcName = `pc_${entry.toString(16)}`;
    let funcIndex = this.mappingAddressToFuncIndex.get(entry) ?? this.#allocNewFuncIndex();

    this.mappingAddressToFuncIndex.set(entry, funcIndex);

    const builder = new binaryen.Module();
    builder.addMemoryImport("memory", "env", "memory");
    builder.addTableImport("funcTable", "env", "funcTable");

    const relooper = new binaryen.Relooper(builder);

    const pcToCfg = new Map<number, binaryen.RelooperBlockRef>();
    const pendingPcs = [entry];
    const branches: { fromPc: number, toPc: number, condition?: binaryen.ExpressionRef, code?: binaryen.ExpressionRef }[] = [];
    const locals: binaryen.Type[] = [binaryen.i32];
    const freeLocals = new Set<number>();

    while (pendingPcs.length) {
      const blockStartPc = pendingPcs.pop()!;
      if (pcToCfg.has(blockStartPc)) {
        continue;
      }

      console.log("Block at", blockStartPc.toString(16));

      const body: binaryen.ExpressionRef[] = [];
      let stop = false;

      const ctx: CompilerCtx = {
        cpu: this.#cpu,
        pc: blockStartPc,
        builder,
        emit(code) {
          body.push(code);
        },
        branch(toPc, condition, code) {
          branches.push({ fromPc: blockStartPc, toPc, condition, code });
          if (!pcToCfg.has(toPc)) {
            pendingPcs.push(toPc);
          }
          stop = true;
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
        freeLocal(id) {
          if (freeLocals.has(id)) {
            throw new Error("Local already freed");
          }
          freeLocals.add(id);
        },
      };

      while (!stop) {
        const op = this.#cpu.memory.get32Aligned(ctx.pc);
        decoder(op, (instruction, args) => {
          console.log(`${ctx.pc.toString(16).padStart(8, " ")}: ${op.toString(16).padStart(8, "0")}      ${instruction?.asm(args) ?? "???"}`);
          if (!instruction?.jit) {
            console.log("TODO: JIT");
            stop = true;
            return;
          }

          instruction.jit(ctx, args);
        });
        ctx.pc += 4;
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

    const finalExpr = relooper.renderAndDispose(pcToCfg.get(entry)!, 0);

    freeLocals.add(0);

    if (freeLocals.size !== locals.length) {
      throw new Error("Unfreed locals");
    }

    builder.addFunction(funcName, binaryen.none, binaryen.none, locals, finalExpr);
    builder.addFunctionExport(funcName, funcName);

    // builder.optimize();

    console.log(builder.emitText());

    const mod = new WebAssembly.Module(builder.emitBinary());
    const instance = new WebAssembly.Instance(mod, {
      env: {
        memory: this.#cpu.memory.wasmMemory,
        funcTable: this.funcTable
      }
    });

    const func = instance.exports[funcName] as () => void;

    this.funcTable.set(funcIndex, func);

    return func;
  }
}
