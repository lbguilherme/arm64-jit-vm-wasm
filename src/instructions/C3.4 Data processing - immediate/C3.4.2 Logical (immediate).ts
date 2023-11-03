import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";

function ones(len: number) {
  return (1n << BigInt(len)) - 1n;
}

function ror(value: bigint, len: number, shift: number) {
  return ((value >> BigInt(shift)) | (value << BigInt(len - shift))) & ones(len);
}

function replicate(value: bigint, len: number, count: number) {
  let result = 0n;
  for (let i = 0; i < count; i++) {
    result |= value << BigInt(i * len);
  }
  return result;
}

function decodeBitMasks(immn: number, imms: number, immr: number, immediate: boolean, datasize: number) {
  const len = 32 - Math.clz32((immn << 6) | (~imms & 0b111111));
  const levels = Number(ones(len));

  const s = imms & levels;
  const r = immr & levels;
  const diff = (s - r) & 0b111111;
  const esize = 1 << len;
  const d = diff & levels;
  const welem = ones(s + 1);
  const telem = ones(d + 1);
  const wmask = replicate(ror(welem, esize, r), esize, datasize / esize);
  const tmask = replicate(telem, esize, datasize / esize);

  return [wmask, tmask] as const;
}

defineInstruction({
  name: "AND (Bitwise AND)",
  pattern: [["sf", 1], 0, 0, 1, 0, 0, 1, 0, 0, ["N", 1], ["immr", 6], ["imms", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, N, immr, imms, Rn, Rd}) {
    const [imm] = decodeBitMasks(N, imms, immr, true, sf ? 64 : 32);
    return "and\t" + [
      Rd === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      immToString(imm),
    ].join(", ");
  },
  jit(ctx, {sf, N, immr, imms, Rn, Rd}) {
    const [imm] = decodeBitMasks(N, imms, immr, true, sf ? 64 : 32);
    let result;

    if (sf === 0) {
      const operand1 = ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64));
      const operand2 = ctx.builder.i32.const(Number(imm & 0xffffffffn));
      result = ctx.builder.i64.extend_u(ctx.builder.i32.and(operand1, operand2));
    } else {
      const operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
      const operand2 = ctx.builder.i64.const(Number(imm & 0xffffffffn), Number(imm >> 32n));
      result = ctx.builder.i64.and(operand1, operand2);
    }

    if (Rd === 31) {
      const resultLocal = ctx.allocLocal(binaryen.i64);
      return [
        ctx.builder.local.set(resultLocal, result),
        ctx.cpu.storeSpFromLocal(ctx.builder, resultLocal)
      ];
    } else {
      return ctx.builder.global.set(`x${Rd}`, result);
    }
  }
});
