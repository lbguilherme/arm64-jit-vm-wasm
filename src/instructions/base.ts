import binaryen from "binaryen";
import type { CompilerCtx } from "../compiler.js";
import type { Cpu } from "../cpu.js";

interface ParamOptions {
  not?: number | number[];
  only?: number | number[];
}

type Pattern = readonly (0 | 1 | readonly [string, number, ParamOptions?])[];
type PatternLabels<E extends Pattern[number]> = E extends readonly [string, number, ParamOptions?] ? E[0] : never;

export interface Instruction<P extends Pattern = Pattern> {
  name: string;
  pattern: P;
  asm(args: { [K in PatternLabels<P[number]>]: number }): string;
  jit(ctx: CompilerCtx, args: { [K in PatternLabels<P[number]>]: number }): void | binaryen.ExpressionRef | binaryen.ExpressionRef[];
  interpret?(cpu: Cpu, args: { [K in PatternLabels<P[number]>]: number }): void;
}

export function immToString(imm: number | bigint) {
  return imm === 0 ? "#0" : imm > -10 && imm < 10 ? `#${imm}` : `#${imm < 0 ? "-" : ""}0x${(imm < 0 ? -imm : imm).toString(16)}`;
}

export const instructions: Instruction[] = [];

export function defineInstruction<const P>(instruction: P extends Pattern ? Instruction<P> & { pattern: P } : never) {
  instructions.push(instruction);
}

export function signExtend(value: number, bits: number) {
  const sign = value & (1 << (bits - 1));
  return sign ? value | (0xffffffff << bits) : value;
}
