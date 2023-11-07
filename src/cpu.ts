import binaryen from "binaryen";
import { Compiler } from "./compiler.js";
import { Memory } from "./system.js";

const registers64 = [
  "instruction_counter",
  "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7",
  "x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15",
  "x16", "x17", "x18", "x19", "x20", "x21", "x22", "x23",
  "x24", "x25", "x26", "x27", "x28", "x29", "x30",
  "sp_el0", "sp_el1", "elr_el1", "spsr_el1",
] as const;

const registers32 = [
  "pstate.n", "pstate.z", "pstate.c", "pstate.v", "pstate.el", "pstate.sp",
] as const;

type Registers = {
  [K in (typeof registers64)[number] | (typeof registers32)[number]]: K extends (typeof registers64)[number] ? WebAssembly.Global<"i64"> : WebAssembly.Global<"i32">;
};

// This ensures registers are allocated together in memory
function allocateRegisters() {
  const builder = new binaryen.Module();
  for (const reg of registers64) {
    builder.addGlobal(reg, binaryen.i64, true, builder.i64.const(0, 0));
    builder.addGlobalExport(reg, reg);
  }
  for (const reg of registers32) {
    builder.addGlobal(reg, binaryen.i32, true, builder.i32.const(0));
    builder.addGlobalExport(reg, reg);
  }

  const mod = new WebAssembly.Module(builder.emitBinary());
  const instance = new WebAssembly.Instance(mod);

  return instance.exports as Registers;
}

export class Cpu {
  memory: Memory;
  #offset: number;
  compiler: Compiler;
  registers = allocateRegisters();

  constructor(memory: Memory, offset: number) {
    this.memory = memory;
    this.#offset = offset;
    this.compiler = new Compiler(this);

    this.registers["pstate.el"].value = 1;
  }

  execute(pc: number) {
    this.compiler.compileFunction(pc)();
  }

  importRegisters(builder: binaryen.Module) {
    for (const reg of registers64) {
      builder.addGlobalImport(reg, "registers", reg, binaryen.i64, true);
    }
    for (const reg of registers32) {
      builder.addGlobalImport(reg, "registers", reg, binaryen.i32, true);
    }
  }

  loadSp(builder: binaryen.Module) {
    return builder.if(
      builder.global.get("pstate.sp", binaryen.i32),
      builder.if(
        builder.i32.eq(builder.global.get("pstate.el", binaryen.i32), builder.i32.const(0)),
        builder.global.get("sp_el0", binaryen.i64),
        builder.global.get("sp_el1", binaryen.i64),
      ),
      builder.global.get("sp_el0", binaryen.i64)
    );
  }

  storeSpFromLocal(builder: binaryen.Module, localIndex: number) {
    return builder.if(
      builder.global.get("pstate.sp", binaryen.i32),
      builder.if(
        builder.i32.eq(builder.global.get("pstate.el", binaryen.i32), builder.i32.const(0)),
        builder.global.set("sp_el0", builder.local.get(localIndex, binaryen.i64)),
        builder.global.set("sp_el1", builder.local.get(localIndex, binaryen.i64)),
      ),
      builder.global.set("sp_el0", builder.local.get(localIndex, binaryen.i64))
    );
  }
}
