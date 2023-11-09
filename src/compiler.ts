import { Cpu } from "./cpu.js";
import { createInstructionDecoder } from "./decoder.js";
import binaryen from "binaryen";

export interface CompilerCtx {
  cpu: Cpu,
  pc: number,
  builder: binaryen.Module;
  branch(toPc: number, condition?: binaryen.ExpressionRef): void;
  stop(): void;
  getFuncIndex(pc: number): number;
  allocLocal(type: binaryen.Type): number;
}

export class Compiler {
  #cpu: Cpu;
  funcTable = new WebAssembly.Table({ element: "anyfunc", initial: 1 });
  compiledFuncIndexes = new Set<number>();
  mappingAddressToFuncIndex = new Map<number, number>();
  freeFuncIndexes: number[] = [0];
  decodeInstruction = createInstructionDecoder();

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

  createWasmFunc(func: () => bigint) {
    const builder = new binaryen.Module();
    builder.addFunctionImport("imported", "env", "func", binaryen.none, binaryen.i64);
    builder.addFunction("func", binaryen.none, binaryen.i64, [], builder.return_call("imported", [], binaryen.i64));
    builder.addFunctionExport("func", "func");
    const mod = new WebAssembly.Module(builder.emitBinary());
    const instance = new WebAssembly.Instance(mod, { env: { func } });
    return instance.exports.func as () => bigint;
  }

  #jumpToPc = (pc: bigint) => {
    return this.getCompiledFunction(Number(pc))();
  }

  getCompiledFunction(entry: number): () => bigint {
    const timeStart = performance.now();
    const funcName = `pc_${entry.toString(16)}`;
    let funcIndex = this.mappingAddressToFuncIndex.get(entry) ?? this.#allocNewFuncIndex();

    this.mappingAddressToFuncIndex.set(entry, funcIndex);

    if (this.compiledFuncIndexes.has(funcIndex)) {
      return this.funcTable.get(funcIndex);
    }

    const builder = new binaryen.Module();
    builder.addMemoryImport("memory", "env", "memory", true);
    builder.addTableImport("funcTable", "env", "funcTable");
    builder.addFunctionImport("jumpToPc", "env", "jumpToPc", binaryen.i64, binaryen.i64);

    this.#cpu.importRegisters(builder);

    const relooper = new binaryen.Relooper(builder);

    const pcToCfg = new Map<number, binaryen.RelooperBlockRef>();
    const pendingPcs = [entry];
    const branches: { fromPc: number, toPc: number, condition?: binaryen.ExpressionRef, code?: binaryen.ExpressionRef }[] = [];
    const locals: binaryen.Type[] = [binaryen.i32];
    const freeLocals = new Set<number>();
    const reservedLocals = new Set<number>([0]);

    let hasBranched = false;

    const ctx: CompilerCtx = {
      cpu: this.#cpu,
      pc: 0,
      builder,
      branch(toPc, condition) {
        if (hasBranched) {
          throw new Error("Can't branch twice");
        }
        if (process.env.VERBOSE) {
          if (condition) {
            console.log(`\t(conditional branch to ${toPc.toString(16)})`);
          } else {
            console.log(`\t(branch to ${toPc.toString(16)})`);
          }
        }
        branches.push({ fromPc: this.pc, toPc, condition });
        pendingPcs.push(toPc);
        if (condition) {
          branches.push({ fromPc: this.pc, toPc: ctx.pc + 4 });
          pendingPcs.push(ctx.pc + 4);
        }
        hasBranched = true;
      },
      stop() {
        if (process.env.VERBOSE) {
          console.log(`\t(stop)`);
        }
        hasBranched = true;
      },
      getFuncIndex: (funcPc) => {
        if (process.env.VERBOSE) {
          console.log(`\t(function at ${funcPc.toString(16)})`);
        }
        const existingIndex = this.mappingAddressToFuncIndex.get(funcPc);
        if (existingIndex !== undefined) {
          return existingIndex;
        }

        const stub = this.createWasmFunc(() => this.getCompiledFunction(funcPc)());

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

    while (pendingPcs.length) {
      ctx.pc = pendingPcs.pop()!;
      if (pcToCfg.has(ctx.pc)) {
        continue;
      }

      hasBranched = false;

      const op = this.#cpu.memory.get32Aligned(ctx.pc);
      const body: binaryen.ExpressionRef[] = [];

      if (op === undefined) {
        throw new Error(`Out of bounds at ${ctx.pc.toString(16)}`);
      }

      // body.push(
      //   builder.global.set("instruction_counter", builder.i64.add(
      //     builder.global.get("instruction_counter", binaryen.i64),
      //     builder.i64.const(1, 0)
      //   ))
      // );

      this.decodeInstruction(op, (instruction, args) => {
        if (process.env.VERBOSE) {
          console.log(`${ctx.pc.toString(16).padStart(8, " ")}: ${op.toString(16).padStart(8, "0").match(/../g)!.reverse().join("")}      ${instruction?.asm(args) ?? "???"}`);
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
        branches.push({ fromPc: ctx.pc, toPc: ctx.pc + 4 });
        pendingPcs.push(ctx.pc + 4);
      }

      const block = relooper.addBlock(builder.block(null, body));
      pcToCfg.set(ctx.pc, block);
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

    builder.addFunction(funcName, binaryen.none, binaryen.i64, locals, finalExpr);
    builder.addFunctionExport(funcName, funcName);

    const timeRender = performance.now();

    // builder.validate();
    // builder.optimize();

    const timeFinal = performance.now();

    if (process.env.VERBOSE) {
      console.log(`Codegen: ${timeCodegen - timeStart}ms`);
      console.log(`Render: ${timeRender - timeCodegen}ms`);
      console.log(`Optimize: ${timeFinal - timeRender}ms`);
      console.log(builder.emitText());
    }

    const mod = new WebAssembly.Module(builder.emitBinary());
    const instance = new WebAssembly.Instance(mod, {
      env: {
        memory: this.#cpu.memory.wasmMemory,
        funcTable: this.funcTable,
        jumpToPc: this.#jumpToPc
      },
      registers: this.#cpu.registers as unknown as Record<string, WebAssembly.Global>,
    });

    const func = instance.exports[funcName] as () => bigint;

    this.funcTable.set(funcIndex, func);
    this.compiledFuncIndexes.add(funcIndex);

    return func;
  }
}
