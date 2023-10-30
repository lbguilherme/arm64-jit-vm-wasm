import { CompilerCtx } from "../compiler.js";
import { Cpu } from "../cpu.js";

type Pattern = readonly (0 | 1 | readonly [string, number])[];
type PatternLabels<E extends Pattern[number]> = E extends readonly [string, number] ? E[0] : never;

export interface Instruction<P extends Pattern = Pattern> {
  name: string;
  pattern: P;
  asm(args: { [K in PatternLabels<P[number]>]: number }): string;
  jit?(ctx: CompilerCtx, args: { [K in PatternLabels<P[number]>]: number }): void;
  interpret?(cpu: Cpu, args: { [K in PatternLabels<P[number]>]: number }): void;
}

export function condName(cond: number) {
  switch (cond) {
    case 0b0000: return "eq";
    case 0b0001: return "ne";
    case 0b0010: return "cs";
    case 0b0011: return "cc";
    case 0b0100: return "mi";
    case 0b0101: return "pl";
    case 0b0110: return "vs";
    case 0b0111: return "vc";
    case 0b1000: return "hi";
    case 0b1001: return "ls";
    case 0b1010: return "ge";
    case 0b1011: return "lt";
    case 0b1100: return "gt";
    case 0b1101: return "le";
    case 0b1110: return "al";
    case 0b1111: return "al";
  }
}

export function immToString(imm: number) {
  return imm === 0 ? "#0" : `#0x${imm.toString(16)}`;
}

export const instructions: Instruction[] = [];

export function defineInstruction<const P>(instruction: P extends Pattern ? Instruction<P> & { pattern: P } : never) {
  instructions.push(instruction);
}
