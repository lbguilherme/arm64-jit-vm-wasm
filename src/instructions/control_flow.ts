import binaryen from "binaryen";
import { defineInstruction, immToString } from "./base.js";

defineInstruction({
  name: "Nop",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  asm() {
    return `nop`;
  },
});

defineInstruction({
  name: "Branch",
  pattern: [0, 0, 0, 1, 0, 1, ["imm26", 26]],
  asm({imm26}) {
    return `b ${immToString((imm26 * 4) + 4)}`;
  },
  jit(ctx, {imm26}) {
    ctx.branch(ctx.pc + imm26 * 4);
  }
});

defineInstruction({
  name: "Branch with Link",
  pattern: [1, 0, 0, 1, 0, 1, ["imm26", 26]],
  asm({imm26}) {
    return `bl ${immToString((imm26 * 4) + 4)}`;
  },
  jit(ctx, {imm26}) {
    const funcIndex = ctx.getFuncIndex(ctx.pc + imm26 * 4);
    ctx.emit(
      ctx.cpu.storeX(ctx.builder, 30, ctx.builder.i64.const(ctx.pc + 4, 0))
    );
    ctx.emit(
      (ctx.builder.call_indirect as any)(
        "funcTable",
        ctx.builder.i32.const(funcIndex),
        [],
        binaryen.none,
        binaryen.none
      )
    );
  },
});
