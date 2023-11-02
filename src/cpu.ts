import binaryen from "binaryen";
import { Compiler } from "./compiler.js";
import { Memory } from "./system.js";

const registers64 = [
  "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7",
  "x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15",
  "x16", "x17", "x18", "x19", "x20", "x21", "x22", "x23",
  "x24", "x25", "x26", "x27", "x28", "x29", "x30",
  "sp_el0", "sp_el1", "sp_el2", "sp_el3",
] as const;

const registers32 = [
  "pstate.n", "pstate.z", "pstate.c", "pstate.v", "pstate.el", "pstate.sp",
] as const;

export class Cpu {
  memory: Memory;
  #offset: number;
  compiler: Compiler;
  registers: {
    [K in (typeof registers64)[number] | (typeof registers32)[number]]: WebAssembly.Global;
  };

  constructor(memory: Memory, offset: number) {
    this.memory = memory;
    this.#offset = offset;
    this.compiler = new Compiler(this);

    const registers = {} as Record<string, WebAssembly.Global>;

    for (const reg of registers64) {
      registers[reg] = new WebAssembly.Global({ value: "i64", mutable: true }, 0n);
    }
    for (const reg of registers32) {
      registers[reg] = new WebAssembly.Global({ value: "i32", mutable: true }, 0);
    }

    this.registers = registers as typeof this.registers;

    this.registers["pstate.el"].value = 3;
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
      builder.i32.const(0),
      builder.if(
        builder.i32.eq(builder.global.get("pstate.el", binaryen.i32), builder.i32.const(0)),
        builder.global.get("sp_el0", binaryen.i64),
        builder.if(
          builder.i32.eq(builder.global.get("pstate.el", binaryen.i32), builder.i32.const(1)),
          builder.global.get("sp_el1", binaryen.i64),
          builder.if(
            builder.i32.eq(builder.global.get("pstate.el", binaryen.i32), builder.i32.const(2)),
            builder.global.get("sp_el2", binaryen.i64),
            builder.global.get("sp_el3", binaryen.i64),
          )
        )
      )
    );
  }
}
