import binaryen from "binaryen";
import { CompilerCtx } from "../compiler.js";
import { Cpu } from "../cpu.js";

type Pattern = readonly (0 | 1 | readonly [string, number])[];
type PatternLabels<E extends Pattern[number]> = E extends readonly [string, number] ? E[0] : never;

export interface Instruction<P extends Pattern = Pattern> {
  name: string;
  pattern: P;
  asm(args: { [K in PatternLabels<P[number]>]: number }): string;
  jit?(ctx: CompilerCtx, args: { [K in PatternLabels<P[number]>]: number }): void | binaryen.ExpressionRef | binaryen.ExpressionRef[];
  interpret?(cpu: Cpu, args: { [K in PatternLabels<P[number]>]: number }): void;
}

export function immToString(imm: number) {
  return imm === 0 ? "#0" : `#0x${imm.toString(16)}`;
}

export const instructions: Instruction[] = [];

export function defineInstruction<const P>(instruction: P extends Pattern ? Instruction<P> & { pattern: P } : never) {
  instructions.push(instruction);
}
