import binaryen from "binaryen";
import { defineInstruction, immToString, signExtend } from "../base.js";

defineInstruction({
  name: "STUR (Store register (unscaled offset))",
  pattern: [1, ["sf", 1], 1, 1, 1, 0, 0, 0, 0, 0, 0, ["imm9", 9], 0, 0, ["Rn", 5], ["Rt", 5]],
  asm({sf, imm9, Rn, Rt}) {
    const reg = Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`;
    const imm = immToString(signExtend(imm9, 9));
    return "stur\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      imm9 === 0 ? `[${reg}]` : `[${reg}, ${imm}]`
    ].join(", ");
  },
  jit(ctx, {sf, imm9, Rn, Rt}) {
    const offset = signExtend(imm9, 9);

    const address = ctx.builder.i32.wrap(Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64));

    return sf === 0
      ? ctx.builder.i32.store(offset, 4, address, ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt}`, binaryen.i64)))
      : ctx.builder.i64.store(offset, 8, address, ctx.builder.global.get(`x${Rt}`, binaryen.i64));
  }
});

defineInstruction({
  name: "LDUR (Load register (unscaled offset))",
  pattern: [1, ["sf", 1], 1, 1, 1, 0, 0, 0, 0, 1, 0, ["imm9", 9], 0, 0, ["Rn", 5], ["Rt", 5]],
  asm({sf, imm9, Rn, Rt}) {
    const reg = Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`;
    const imm = immToString(signExtend(imm9, 9));
    return "ldur\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      imm9 === 0 ? `[${reg}]` : `[${reg}, ${imm}]`
    ].join(", ");
  },
  jit(ctx, {sf, imm9, Rn, Rt}) {
    const offset = signExtend(imm9, 9);

    const address = ctx.builder.i32.wrap(Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64));

    return sf === 0
      ? ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.extend_u(ctx.builder.i32.load(offset, 4, address)))
      : ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.load(offset, 8, address));
  }
});
