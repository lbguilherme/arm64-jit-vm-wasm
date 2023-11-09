import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "MOVZ (Move wide with zero) / MOV (Move)",
  pattern: [["sf", 1], 1, 0, 1, 0, 0, 1, 0, 1, ["hw", 2], ["imm16", 16], ["Rd", 5]],
  asm({sf, hw, imm16, Rd}) {
    if (imm16 !== 0 || hw === 0) {
      return "mov\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        immToString(imm16),
        ...(hw === 0 || imm16 === 0 ? [] : [`lsl #${hw * 16}`]),
      ].join(", ");
    } else {
      return "movz\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        immToString(imm16),
        ...(hw === 0 || imm16 === 0 ? [] : [`lsl #${hw * 16}`]),
      ].join(", ");
    }
  },
  jit(ctx, {hw, imm16, Rd}) {
    const value = BigInt(imm16) << BigInt(hw * 16);

    return ctx.builder.global.set(`x${Rd}`,
      ctx.builder.i64.const(Number(value & 0xffffffffn), Number(value >> 32n))
    );
  }
});

defineInstruction({
  name: "MOVK (Move wide with keep)",
  pattern: [["sf", 1], 1, 1, 1, 0, 0, 1, 0, 1, ["hw", 2], ["imm16", 16], ["Rd", 5]],
  asm({sf, hw, imm16, Rd}) {
    return "movk\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      immToString(imm16),
      ...(hw === 0 || imm16 === 0 ? [] : [`lsl #${hw * 16}`]),
    ].join(", ");
  },
  jit(ctx, {sf, hw, imm16, Rd}) {
    let value = ctx.builder.global.get(`x${Rd}`, binaryen.i64);

    const mask = (BigInt(0xffffn) << BigInt(hw * 16)) ^ BigInt(0xffffffffffffffffn);
    value = ctx.builder.i64.and(value, ctx.builder.i64.const(Number(mask & 0xffffffffn), sf ? Number(mask >> 32n) : 0));

    const newBits = BigInt(imm16) << BigInt(hw * 16);
    value = ctx.builder.i64.or(value, ctx.builder.i64.const(Number(newBits & 0xffffffffn), Number(newBits >> 32n)));

    return ctx.builder.global.set(`x${Rd}`, value);
  }
});
