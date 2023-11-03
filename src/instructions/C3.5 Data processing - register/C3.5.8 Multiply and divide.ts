import binaryen from "binaryen";
import { defineInstruction } from "../base.js";

defineInstruction({
  name: "MADD (Multiply-Add)",
  pattern: [["sf", 1], 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, ["Rm", 5], 0, ["Ra", 5], ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, Ra, Rn, Rd}) {
    return (Ra === 31 ? "mul\t" : "madd\t") + [
      `${sf ? "x" : "w"}${Rd}`,
      `${sf ? "x" : "w"}${Rn}`,
      `${sf ? "x" : "w"}${Rm}`,
      ...(Ra === 31 ? [] : [`${sf ? "x" : "w"}${Rm}`])
    ].join(", ");
  },
  jit(ctx, {sf, Rm, Ra, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit SUB not implemented");
    }

    let result = ctx.builder.i64.mul(
      ctx.builder.global.get(`x${Rn}`, binaryen.i64),
      ctx.builder.global.get(`x${Rm}`, binaryen.i64)
    );

    if (Ra !== 31) {
      result = ctx.builder.i64.add(
        result,
        ctx.builder.global.get(`x${Ra}`, binaryen.i64)
      );
    }

    return ctx.builder.global.set(`x${Rd}`, result);
  }
});
