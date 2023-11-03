import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { addWithCarry64 } from "../common/math.js";

defineInstruction({
  name: "SUBS (Subtract and set flags)",
  pattern: [["sf", 1], 1, 1, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, sh, imm12, Rn, Rd}) {
    return (Rd === 31 ? `cmp\t` : "subs\t") + [
      ...(Rd === 31 ? [] : [`${sf ? "x" : "w"}${Rd}`]),
      Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`,
      immToString(imm12),
      ...(sh ? ["lsl #12"] : [])
    ].join(", ");
  },
  jit(ctx, {sf, sh, imm12, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit SUBS not implemented");
    }
    const operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = ctx.builder.i64.const(~(sh ? imm12 << 12 : imm12), 0xffffffff);
    const { resultLocal, code } = addWithCarry64(ctx, operand1, operand2, true);
    return [
      ...code,
      ...(Rd === 31 ? [] : [
        ctx.builder.global.set(`x${Rd}`, ctx.builder.local.get(resultLocal, binaryen.i64))
      ])
    ];
  }
});

defineInstruction({
  name: "SUB (Subtract)",
  pattern: [["sf", 1], 1, 0, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, sh, imm12, Rn, Rd}) {
    return "sub\t" + [
      Rd === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rd}`,
      Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`,
      immToString(imm12),
      ...(sh ? ["lsl #12"] : [])
    ].join(", ");
  },
  jit(ctx, {sf, sh, imm12, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit SUB not implemented");
    }
    const operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = ctx.builder.i64.const(sh ? imm12 << 12 : imm12, 0);
    const result = ctx.builder.i64.sub(operand1, operand2);
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
