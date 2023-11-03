import binaryen from "binaryen";
import { defineInstruction, immToString, signExtend } from "../base.js";
import { add32, add64, addWithCarry32, addWithCarry64 } from "../common/math.js";

defineInstruction({
  name: "ADD (Add)",
  pattern: [["sf", 1], 0, 0, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, sh, imm12, Rn, Rd}) {
    return "add\t" + [
      Rd === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rd}`,
      Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`,
      immToString(imm12),
      ...(sh ? ["lsl #12"] : [])
    ].join(", ");
  },
  jit(ctx, {sf, sh, imm12, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit ADD not implemented");
    }
    const operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = ctx.builder.i64.const(sh ? imm12 << 12 : imm12, 0);
    const result = ctx.builder.i64.add(operand1, operand2);
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

defineInstruction({
  name: "ADD (Add) / SUB (Subtract)",
  pattern: [["sf", 1], ["op", 1], 0, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, op, sh, imm12, Rn, Rd}) {
    return (op === 0 ? "add\t" : "sub\t") + [
      Rd === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rd}`,
      Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`,
      immToString(imm12),
      ...(sh ? ["lsl #12"] : [])
    ].join(", ");
  },
  jit(ctx, {sf, op, sh, imm12, Rn, Rd}) {
    let operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    if (sf === 0) {
      operand1 = ctx.builder.i32.wrap(operand1);
    }
    const imm = (op === 1 ? signExtend(imm12, 12) : imm12) << (sh ? 12 : 0);
    const operand2 = sf === 0 ? ctx.builder.i32.const(imm) : ctx.builder.i64.const(imm, imm < 0 ? -1 : 0);
    const result = op === 0
      ? sf === 0 ? ctx.builder.i64.extend_u(ctx.builder.i32.add(operand1, operand2)) : ctx.builder.i64.add(operand1, operand2)
      : sf === 0 ? ctx.builder.i64.extend_u(ctx.builder.i32.sub(operand1, operand2)) : ctx.builder.i64.sub(operand1, operand2);
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

defineInstruction({
  name: "ADDS (Add and set flags) / SUBS (Subtract and set flags) / CMP (Compare) / CMN (Compare negative)",
  pattern: [["sf", 1], ["op", 1], 1, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, op, sh, imm12, Rn, Rd}) {
    return (op === 0 ? (Rd === 31 ? `cmn\t` : "adds\t") : (Rd === 31 ? `cmp\t` : "subs\t")) + [
      ...(Rd === 31 ? [] : [`${sf ? "x" : "w"}${Rd}`]),
      Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`,
      immToString(imm12),
      ...(sh ? ["lsl #12"] : [])
    ].join(", ");
  },
  jit(ctx, {sf, op, sh, imm12, Rn, Rd}) {
    let operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    if (sf === 0) {
      operand1 = ctx.builder.i32.wrap(operand1);
    }
    const imm = (op === 1 ? ~signExtend(imm12, 12) : imm12) << (sh ? 12 : 0);
    let operand2 = sf === 0 ? ctx.builder.i32.const(imm) : ctx.builder.i64.const(imm, imm < 0 ? -1 : 0);
    const { resultLocal, code } = op === 0
      ? (sf === 0 ? add32(ctx, operand1, operand2) : add64(ctx, operand1, operand2))
      : (sf === 0 ? addWithCarry32(ctx, operand1, operand2, true) : addWithCarry64(ctx, operand1, operand2, true));

    return [
      ...code,
      ...(Rd === 31 ? [] : [
        ctx.builder.global.set(`x${Rd}`, ctx.builder.local.get(resultLocal, binaryen.i64))
      ])
    ];
  }
});
