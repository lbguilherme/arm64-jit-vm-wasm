import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "B (Branch unconditionally)",
  pattern: [0, 0, 0, 1, 0, 1, ["imm26", 26]],
  asm({imm26}) {
    return `b\t${immToString((imm26 * 4) + 4)}`;
  },
  jit(ctx, {imm26}) {
    ctx.branch(ctx.pc + imm26 * 4);
  }
});

defineInstruction({
  name: "BL (Branch with link)",
  pattern: [1, 0, 0, 1, 0, 1, ["imm26", 26]],
  asm({imm26}) {
    return `bl\t${immToString((imm26 * 4) + 4)}`;
  },
  jit(ctx, {imm26}) {
    const funcIndex = ctx.getFuncIndex(ctx.pc + imm26 * 4);
    const returnPcLocal = ctx.allocLocal(binaryen.i64);

    return [
      ctx.builder.global.set("x30", ctx.builder.i64.const(ctx.pc + 4, 0)),
      ctx.builder.local.set(returnPcLocal, ctx.builder.call_indirect(
        "funcTable",
        ctx.builder.i32.const(funcIndex),
        [],
        binaryen.none,
        binaryen.i64
      )),
      ctx.builder.if(
        ctx.builder.i64.eq(
          ctx.builder.local.get(returnPcLocal, binaryen.i64),
          ctx.builder.i64.const(ctx.pc + 4, 0)
        ),
        ctx.builder.nop(),
        ctx.builder.return(ctx.builder.local.get(returnPcLocal, binaryen.i64))
      )
    ];
  },
});
