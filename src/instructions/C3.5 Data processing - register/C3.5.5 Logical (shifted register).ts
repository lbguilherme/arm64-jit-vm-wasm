import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { shiftEval64, shiftName } from "../common/shift.js";

defineInstruction({
  name: "ORR (Bitwise inclusive OR)",
  pattern: [["sf", 1], 0, 1, 0, 1, 0, 1, 0, ["shift", 2], 0, ["Rm", 5], ["imm6", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, shift, Rm, imm6, Rn, Rd}) {
    return (Rn === 31 && imm6 === 0 ? "mov\t" : "orr\t") + [
      `${sf ? "x" : "w"}${Rd}`,
      ...(Rn === 31 && imm6 === 0 ? [] : [`${sf ? "x" : "w"}${Rn === 31 ? "zr" : Rn}`]),
      `${sf ? "x" : "w"}${Rm}`,
      ...(imm6 !== 0 ? [`${shiftName(shift)} ${immToString(imm6)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, shift, Rm, imm6, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit ORR/MOV not implemented");
    }

    const operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = shiftEval64(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));
    const result = Rn === 31 ? operand2 : ctx.builder.i64.or(operand1, operand2);

    return ctx.builder.global.set(`x${Rd}`, result);
  }
});

defineInstruction({
  name: "AND (Bitwise AND)",
  pattern: [["sf", 1], 0, 0, 0, 1, 0, 1, 0, ["shift", 2], 0, ["Rm", 5], ["imm6", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, shift, Rm, imm6, Rn, Rd}) {
    return "and\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
      ...(imm6 !== 0 ? [`${shiftName(shift)} ${immToString(imm6)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, shift, Rm, imm6, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit AND not implemented");
    }

    const operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = shiftEval64(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));
    const result = ctx.builder.i64.and(operand1, operand2);

    return ctx.builder.global.set(`x${Rd}`, result);
  }
});

defineInstruction({
  name: "ANDS (Bitwise AND and set flags)",
  pattern: [["sf", 1], 1, 1, 0, 1, 0, 1, 0, ["shift", 2], 0, ["Rm", 5], ["imm6", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, shift, Rm, imm6, Rn, Rd}) {
    return (Rd === 31 ? "tst\t" : "ands\t") + [
      ...(Rd === 31 ? [] : [`${sf ? "x" : "w"}${Rd}`]),
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
      ...(imm6 !== 0 ? [`${shiftName(shift)} ${immToString(imm6)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, shift, Rm, imm6, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit ANDS not implemented");
    }

    const operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = shiftEval64(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));
    const result = ctx.builder.i64.and(operand1, operand2);
    const resultLocal = ctx.allocLocal(binaryen.i64);

    return [
      ctx.builder.local.set(resultLocal, result),
      ctx.builder.global.set("pstate.n",
        ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0))
      ),
      ctx.builder.global.set("pstate.z",
        ctx.builder.i64.eqz(ctx.builder.local.get(resultLocal, binaryen.i64))
      ),
      ctx.builder.global.set("pstate.c", ctx.builder.i32.const(0)),
      ctx.builder.global.set("pstate.v", ctx.builder.i32.const(0)),
      ...(Rd === 31 ? [] : [ctx.builder.global.set(`x${Rd}`, ctx.builder.local.get(resultLocal, binaryen.i64))])
    ];
  }
});

defineInstruction({
  name: "BIC (Bitwise bit clear)",
  pattern: [["sf", 1], 0, 0, 0, 1, 0, 1, 0, ["shift", 2], 1, ["Rm", 5], ["imm6", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, shift, Rm, imm6, Rn, Rd}) {
    return "bic\t" + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
      ...(imm6 !== 0 ? [`${shiftName(shift)} ${immToString(imm6)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, shift, Rm, imm6, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit BIC not implemented");
    }

    const operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = shiftEval64(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));
    const result = ctx.builder.i64.and(operand1, ctx.builder.i64.xor(operand2, ctx.builder.i64.const(-1, -1)));

    return ctx.builder.global.set(`x${Rd}`, result);
  }
});
