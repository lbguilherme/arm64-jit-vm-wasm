import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { shiftEval, shiftName } from "../common/shift.js";

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
    const operand2 = shiftEval(ctx.builder, shift, imm6, ctx.builder.global.get(`x${Rm}`, binaryen.i64));
    const result = Rn === 31 ? operand2 : ctx.builder.i64.or(operand1, operand2);

    return ctx.builder.global.set(`x${Rd}`, result);
  }
});
