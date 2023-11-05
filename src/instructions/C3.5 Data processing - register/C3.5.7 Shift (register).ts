import binaryen from "binaryen";
import { defineInstruction } from "../base.js";

defineInstruction({
  name: "ASR (Arithmetic shift right)",
  pattern: [["sf", 1], 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, ["Rm", 5], 0, 0, 1, 0, 1, 0, ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, Rn, Rd}) {
    return "asr\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
    ].join(", ");
  },
  jit(ctx, {sf, Rm, Rn, Rd}) {
    if (sf === 0) {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.extend_u(ctx.builder.i32.shr_s(
        ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rm}`, binaryen.i64)),
        ctx.builder.i32.and(ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64)), ctx.builder.i32.const(0b11111))
      )));
    } else {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.shr_s(
        ctx.builder.global.get(`x${Rm}`, binaryen.i64),
        ctx.builder.i64.and(ctx.builder.global.get(`x${Rn}`, binaryen.i64), ctx.builder.i64.const(0b111111, 0))
      ));
    }
  }
});

defineInstruction({
  name: "LSL (Logical shift left)",
  pattern: [["sf", 1], 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, ["Rm", 5], 0, 0, 1, 0, 0, 0, ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, Rn, Rd}) {
    return "lsl\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
    ].join(", ");
  },
  jit(ctx, {sf, Rm, Rn, Rd}) {
    if (sf === 0) {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.extend_u(ctx.builder.i32.shl(
        ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rm}`, binaryen.i64)),
        ctx.builder.i32.and(ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64)), ctx.builder.i32.const(0b11111))
      )));
    } else {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.shl(
        ctx.builder.global.get(`x${Rm}`, binaryen.i64),
        ctx.builder.i64.and(ctx.builder.global.get(`x${Rn}`, binaryen.i64), ctx.builder.i64.const(0b111111, 0))
      ));
    }
  }
});

defineInstruction({
  name: "LSR (Logical shift right)",
  pattern: [["sf", 1], 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, ["Rm", 5], 0, 0, 1, 0, 0, 1, ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, Rn, Rd}) {
    return "lsr\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
    ].join(", ");
  },
  jit(ctx, {sf, Rm, Rn, Rd}) {
    if (sf === 0) {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.extend_u(ctx.builder.i32.shr_u(
        ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rm}`, binaryen.i64)),
        ctx.builder.i32.and(ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64)), ctx.builder.i32.const(0b11111))
      )));
    } else {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.shr_u(
        ctx.builder.global.get(`x${Rm}`, binaryen.i64),
        ctx.builder.i64.and(ctx.builder.global.get(`x${Rn}`, binaryen.i64), ctx.builder.i64.const(0b111111, 0))
      ));
    }
  }
});

defineInstruction({
  name: "ROR (Rotate right)",
  pattern: [["sf", 1], 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, ["Rm", 5], 0, 0, 1, 0, 1, 1, ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, Rn, Rd}) {
    return "ror\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
    ].join(", ");
  },
  jit(ctx, {sf, Rm, Rn, Rd}) {
    if (sf === 0) {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.extend_u(ctx.builder.i32.rotr(
        ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rm}`, binaryen.i64)),
        ctx.builder.i32.and(ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64)), ctx.builder.i32.const(0b11111))
      )));
    } else {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.rotr(
        ctx.builder.global.get(`x${Rm}`, binaryen.i64),
        ctx.builder.i64.and(ctx.builder.global.get(`x${Rn}`, binaryen.i64), ctx.builder.i64.const(0b111111, 0))
      ));
    }
  }
});
