import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { shiftEval32, shiftEval64, shiftName } from "../common/shift.js";
import { add32, add64, addWithCarry32, addWithCarry64 } from "../common/math.js";

defineInstruction({
  name: "ADD (Add) / SUB (Subtract)",
  pattern: [["sf", 1], ["op", 1], 0, 0, 1, 0, 1, 1, ["shift", 2], 0, ["Rm", 5], ["imm6", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, op, shift, Rm, imm6, Rn, Rd}) {
    return (op === 0 ? "add\t" : "sub\t") + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
      ...(imm6 !== 0 ? [`${shiftName(shift)} ${immToString(imm6)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, op, shift, Rm, imm6, Rn, Rd}) {
    let operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    if (sf === 0) {
      operand1 = ctx.builder.i32.wrap(operand1);
    }
    const operand2 = (sf ? shiftEval64 : shiftEval32)(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));

    const method = op === 0 ? "add" : "sub";

    const result = sf === 0
      ? ctx.builder.i64.extend_u(ctx.builder.i32[method](ctx.builder.i32.wrap(operand1), ctx.builder.i32.wrap(operand2)))
      : ctx.builder.i64[method](operand1, operand2);

    return ctx.builder.global.set(`x${Rd}`, result);
  }
});

defineInstruction({
  name: "ADDS (Add and set flags) / SUBS (Subtract and set flags) / CMP (Compare) / CMN (Compare negative)",
  pattern: [["sf", 1], ["op", 1], 1, 0, 1, 0, 1, 1, ["shift", 2], 0, ["Rm", 5], ["imm6", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, op, shift, Rm, imm6, Rn, Rd}) {
    return (op === 0 ? (Rd === 31 ? `cmn\t` : "adds\t") : (Rd === 31 ? `cmp\t` : "subs\t")) + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
      ...(imm6 !== 0 ? [`${shiftName(shift)} ${immToString(imm6)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, op, shift, Rm, imm6, Rn, Rd}) {
    let operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    if (sf === 0) {
      operand1 = ctx.builder.i32.wrap(operand1);
    }

    let operand2 = (sf ? shiftEval64 : shiftEval32)(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));
    if (op) {
      operand2 = sf ? ctx.builder.i64.sub(ctx.builder.i64.const(0, 0), operand2) : ctx.builder.i32.sub(ctx.builder.i32.const(0), operand2);
    }

    const { resultLocal, code } = sf === 0 ? add32(ctx, operand1, operand2) : add64(ctx, operand1, operand2);

    return [
      ...code,
      ...(Rd === 31 ? [] : [
        ctx.builder.global.set(`x${Rd}`, ctx.builder.local.get(resultLocal, binaryen.i64))
      ])
    ];
  }
});
