import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { decodeBitMasks } from "../common/bitmasks.js";

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
