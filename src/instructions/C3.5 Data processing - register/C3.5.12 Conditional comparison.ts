import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { condEval, condName } from "../common/cond.js";
import { addWithCarry64 } from "../common/math.js";

defineInstruction({
  name: "CCMP (Conditional compare (immediate))",
  pattern: [["sf", 1], 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, ["imm5", 5], ["cond", 4], 1, 0, ["Rn", 5], 0, ["nzcv", 4]],
  asm({sf, imm5, cond, Rn, nzcv}) {
    return "ccmp\t" + [
      `${sf ? "x" : "w"}${Rn}`,
      immToString(imm5),
      immToString(nzcv),
      condName(cond)
    ].join(", ");
  },
  jit(ctx, {sf, imm5, cond, Rn, nzcv}) {
    if (sf === 0) {
      throw new Error("32-bit CCMP not implemented");
    }
    const operand1 = ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = ctx.builder.i64.const(~imm5, 0xffffffff);
    const { code } = addWithCarry64(ctx, operand1, operand2, true);
    return ctx.builder.if(
      condEval(ctx.builder, cond),
      ctx.builder.block(null, code),
      ctx.builder.block(null, [
        ctx.builder.global.set("pstate.n", ctx.builder.i32.const(nzcv & 0b1000 ? 1 : 0)),
        ctx.builder.global.set("pstate.z", ctx.builder.i32.const(nzcv & 0b0100 ? 1 : 0)),
        ctx.builder.global.set("pstate.c", ctx.builder.i32.const(nzcv & 0b0010 ? 1 : 0)),
        ctx.builder.global.set("pstate.v", ctx.builder.i32.const(nzcv & 0b0001 ? 1 : 0))
      ])
    );
  }
});
