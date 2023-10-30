import binaryen from "binaryen";
import { CompilerCtx } from "../compiler.js";
import { defineInstruction } from "./base.js";

const systemRegisters: {
  name: string;
  load(ctx: CompilerCtx): binaryen.ExpressionRef;
}[] = [];

systemRegisters[0b11_000_0100_0010_010] = {
  name: "CurrentEL",
  load(ctx) {
    return ctx.builder.i64.shl(
      ctx.builder.i64.extend_u(ctx.cpu.loadPstateEl(ctx.builder)),
      ctx.builder.i64.const(2, 0)
    );
  }
};


defineInstruction({
  name: "MSR",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, ["Rsys", 16], ["Rt", 5]],
  asm({Rsys, Rt}) {
    const systemRegister = systemRegisters[Rsys];
    const name = systemRegister?.name ?? `0b${Rsys.toString(2)}`;
    return `msr x${Rt}, ${name}`;
  },
  jit(ctx, {Rsys, Rt}) {
    const systemRegister = systemRegisters[Rsys];

    if (systemRegister?.load) {
      ctx.emit(
        ctx.cpu.storeX(ctx.builder, Rt, systemRegister.load(ctx))
      );
      return;
    }
  },
});

