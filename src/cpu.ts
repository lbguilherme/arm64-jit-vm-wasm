import binaryen from "binaryen";
import { Compiler } from "./compiler.js";
import { Memory } from "./system.js";

let cpuAreaSize = 0;
let done64 = false;
function alloc64(count = 1) {
  if (done64) throw new Error("64-bit allocation must be done first");
  const result = cpuAreaSize;
  cpuAreaSize += count * 8;
  return result;
}
function alloc32(count = 1) {
  done64 = true;
  const result = cpuAreaSize;
  cpuAreaSize += count * 4;
  return result;
}

const OFFSET_X = alloc64(31);
const OFFSET_SP = alloc64(4);
const OFFSET_PSTATE_N = alloc32();
const OFFSET_PSTATE_Z = alloc32();
const OFFSET_PSTATE_C = alloc32();
const OFFSET_PSTATE_V = alloc32();
const OFFSET_PSTATE_EL = alloc32();
const OFFSET_PSTATE_SP = alloc32();

type Registers = {
  [K in `x${0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30}`]: bigint;
};

export class Cpu {
  memory: Memory;
  #offset: number;
  compiler: Compiler;
  registers: Registers;

  constructor(memory: Memory, offset: number) {
    this.memory = memory;
    this.#offset = offset;
    this.compiler = new Compiler(this);
    this.registers = {} as Registers;

    for (let n = 0; n <= 30; ++n) {
      Object.defineProperty(this.registers, `x${n}`, {
        get: () => this.memory.get64Aligned(this.#offset + OFFSET_X + n * 8),
        set(value: bigint) {
          this.memory.set64Aligned(this.#offset + OFFSET_X + n * 8, value);
        }
      });
    }

    this.memory.set32Aligned(this.#offset + OFFSET_PSTATE_EL, 3);
  }

  execute(pc: number) {
    this.compiler.compileFunction(pc)();
  }

  loadX(builder: binaryen.Module, n: number) {
    if (n < 0 || n > 30) throw new Error("Invalid register");
    return builder.i64.load(this.#offset + OFFSET_X + n * 8, 8, builder.i32.const(0));
  }

  storeX(builder: binaryen.Module, n: number, value: binaryen.ExpressionRef) {
    if (n < 0 || n > 30) throw new Error("Invalid register");
    return builder.i64.store(this.#offset + OFFSET_X + n * 8, 8, builder.i32.const(0), value);
  }

  loadPstateEl(builder: binaryen.Module) {
    return builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_EL))
  }

  loadSp(builder: binaryen.Module) {
    const spOffset = builder.if(
      builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_SP)),
      builder.i32.const(0),
      builder.i32.shl(
        builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_EL)),
        builder.i32.const(3),
      )
    );
    return builder.i64.load(this.#offset + OFFSET_SP, 8, spOffset);
  }

  storePstateN(builder: binaryen.Module, value: binaryen.ExpressionRef) {
    return builder.i32.store(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_N), value);
  }

  loadPstateN(builder: binaryen.Module) {
    return builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_N))
  }

  storePstateZ(builder: binaryen.Module, value: binaryen.ExpressionRef) {
    return builder.i32.store(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_Z), value);
  }

  loadPstateZ(builder: binaryen.Module) {
    return builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_Z))
  }

  storePstateC(builder: binaryen.Module, value: binaryen.ExpressionRef) {
    return builder.i32.store(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_C), value);
  }

  loadPstateC(builder: binaryen.Module) {
    return builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_C))
  }

  storePstateV(builder: binaryen.Module, value: binaryen.ExpressionRef) {
    return builder.i32.store(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_V), value);
  }

  loadPstateV(builder: binaryen.Module) {
    return builder.i32.load(0, 4, builder.i32.const(this.#offset + OFFSET_PSTATE_V))
  }
}
