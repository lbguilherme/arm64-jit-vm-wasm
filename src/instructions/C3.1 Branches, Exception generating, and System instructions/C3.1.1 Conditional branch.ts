import binaryen from "binaryen";
import { defineInstruction, immToString, signExtend } from "../base.js";
import { condEval, condName } from "../common/cond.js";

defineInstruction({
  name: "B.cond (Branch condition) / BC.cond (Branch Consistent conditionally)",
  pattern: [0, 1, 0, 1, 0, 1, 0, 0, ["imm19", 19], ["consistent", 1], ["cond", 4]],
  asm({imm19, consistent, cond}) {
    return `b${consistent ? "c" : ""}.${condName(cond)}\t${immToString((imm19 * 4) + 4)}`;
  },
  jit(ctx, {imm19, cond}) {
    ctx.branch(ctx.pc + imm19 * 4, condEval(ctx.builder, cond));
  }
});

defineInstruction({
  name: "CBZ (Compare and branch if zero) / CBNZ (Compare and branch if nonzero)",
  pattern: [["sf", 1], 0, 1, 1, 0, 1, 0, ["op", 1], ["imm19", 19], ["Rt", 5]],
  asm({sf, op, imm19, Rt}) {
    return (op ? "cbnz\t" : "cbz\t") + [
      `${sf ? "x" : "w"}${Rt}`,
      immToString((signExtend(imm19, 19) * 4) + 4)
    ].join(", ");
  },
  jit(ctx, {sf, op, imm19, Rt}) {
    ctx.branch(
      ctx.pc + signExtend(imm19, 19) * 4,
      op
        ? sf
          ? ctx.builder.i64.ne(ctx.builder.global.get(`x${Rt}`, binaryen.i64), ctx.builder.i64.const(0, 0))
          : ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt}`, binaryen.i64))
        : sf
          ? ctx.builder.i64.eqz(ctx.builder.global.get(`x${Rt}`, binaryen.i64))
          : ctx.builder.i32.eqz(ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt}`, binaryen.i64)))
    );
  }
});

defineInstruction({
  name: "TBZ (Test bit and branch if zero) / TBNZ (Test bit and branch if nonzero)",
  pattern: [["b5", 1], 0, 1, 1, 0, 1, 1, ["op", 1], ["b40", 5], ["imm14", 14], ["Rt", 5]],
  asm({b5, op, b40, imm14, Rt}) {
    return `${op ? "tbnz" : "tbz"}\t` + [
      `${b5 ? "x" : "w"}${Rt}`,
      immToString(b5 * 32 + b40),
      immToString(imm14 * 4)
    ].join(", ");
  },
  jit(ctx, {b5, op, b40, imm14, Rt}) {
    const cond = ctx.builder.i32.and(
      ctx.builder.global.get(`x${Rt}`, binaryen.i64),
      b5 ? ctx.builder.i64.const(0, 1 << b40) : ctx.builder.i64.const(1 << b40, 0)
    );

    ctx.branch(
      ctx.pc + imm14 * 4,
      op ? ctx.builder.i32.eqz(cond) : cond,
    );
  }
});
