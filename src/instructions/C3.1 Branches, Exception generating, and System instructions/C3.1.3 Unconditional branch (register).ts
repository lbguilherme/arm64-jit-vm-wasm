import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "BLR (Branch with link to register)",
  pattern: [1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, ["Rn", 5], 0, 0, 0, 0, 0],
  asm({Rn}) {
    return `blr\tx${Rn}`;
  },
  jit(ctx, {Rn}) {
    const returnPcLocal = ctx.allocLocal(binaryen.i64);

    return [
      ctx.builder.global.set("x30", ctx.builder.i64.const(ctx.pc + 4, 0)),
      ctx.builder.local.set(returnPcLocal, ctx.builder.call(
        "jumpToPc",
        [ctx.builder.global.get(`x${Rn}`, binaryen.i64)],
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

defineInstruction({
  name: "BR (Branch to register)",
  pattern: [1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, ["Rn", 5], 0, 0, 0, 0, 0],
  asm({Rn}) {
    return `br\tx${Rn}`;
  },
  jit(ctx, {Rn}) {
    return [
      ctx.builder.return(ctx.builder.call(
        "jumpToPc",
        [ctx.builder.global.get(`x${Rn}`, binaryen.i64)],
        binaryen.i64
      ))
    ];
  },
});

defineInstruction({
  name: "RET (Return from subroutine)",
  pattern: [1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, ["Rt", 5], 0, 0, 0, 0, 0],
  asm({Rt}) {
    return "ret" + (Rt !== 30 ? `\tx${Rt}` : "");
  },
  jit(ctx, {Rt}) {
    ctx.stop();
    return ctx.builder.return(ctx.builder.global.get(`x${Rt}`, binaryen.i64));
  }
});
