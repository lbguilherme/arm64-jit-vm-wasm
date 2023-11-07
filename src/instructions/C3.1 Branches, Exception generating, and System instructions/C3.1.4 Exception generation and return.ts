import binaryen from "binaryen";
import { defineInstruction } from "../base.js";

defineInstruction({
  name: "RET (Return from subroutine)",
  pattern: [1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  asm() {
    return "eret";
  },
  jit(ctx) {
    ctx.stop();
    const spsrLocal = ctx.allocLocal(binaryen.i32);
    return [
      ctx.builder.local.set(spsrLocal, ctx.builder.i32.wrap(ctx.builder.global.get("spsr_el1", binaryen.i64))),
      ctx.builder.global.set("pstate.n", ctx.builder.i32.and(ctx.builder.i32.shr_u(ctx.builder.local.get(spsrLocal, binaryen.i32), ctx.builder.i32.const(31)), ctx.builder.i32.const(1))),
      ctx.builder.global.set("pstate.z", ctx.builder.i32.and(ctx.builder.i32.shr_u(ctx.builder.local.get(spsrLocal, binaryen.i32), ctx.builder.i32.const(30)), ctx.builder.i32.const(1))),
      ctx.builder.global.set("pstate.c", ctx.builder.i32.and(ctx.builder.i32.shr_u(ctx.builder.local.get(spsrLocal, binaryen.i32), ctx.builder.i32.const(29)), ctx.builder.i32.const(1))),
      ctx.builder.global.set("pstate.v", ctx.builder.i32.and(ctx.builder.i32.shr_u(ctx.builder.local.get(spsrLocal, binaryen.i32), ctx.builder.i32.const(28)), ctx.builder.i32.const(1))),
      ctx.builder.return(ctx.builder.global.get("elr_el1", binaryen.i64))
    ];
  }
});
