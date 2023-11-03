import binaryen from "binaryen";
import { CompilerCtx } from "../../compiler.js";
import { defineInstruction } from "../base.js";

const systemRegisters: {
  name: string;
  load?(ctx: CompilerCtx): binaryen.ExpressionRef;
  store?(ctx: CompilerCtx, value: binaryen.ExpressionRef): binaryen.ExpressionRef;
}[] = [];

systemRegisters[0b11_000_0100_0010_010] = {
  name: "CurrentEL",
  load(ctx) {
    return ctx.builder.i64.shl(
      ctx.builder.i64.extend_u(ctx.builder.global.get("pstate.el", binaryen.i32)),
      ctx.builder.i64.const(2, 0)
    );
  }
};

systemRegisters[0b11_000_0001_0000_000] = {
  name: "SCTLR_EL1",
};

systemRegisters[0b11_100_0001_0000_000] = {
  name: "SCTLR_EL2",
};

systemRegisters[0b11_000_0010_0000_001] = {
  name: "TTBR1_EL1",
};

defineInstruction({
  name: "MRS (Move System register to general-purpose register)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, ["Rsys", 16], ["Rt", 5]],
  asm({Rsys, Rt}) {
    const systemRegister = systemRegisters[Rsys];
    const name = systemRegister?.name ?? `0b${Rsys.toString(2).padStart(16, "0")}`;
    return `mrs\tx${Rt}, ${name}`;
  },
  jit(ctx, {Rsys, Rt}) {
    const systemRegister = systemRegisters[Rsys];

    if (systemRegister?.load) {
      return ctx.builder.global.set(`x${Rt}`, systemRegister.load(ctx));
    } else {
      return ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.const(0, 0));
    }
  },
});


defineInstruction({
  name: "MSR (Move general-purpose register to System register)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, ["Rsys", 16], ["Rt", 5]],
  asm({Rsys, Rt}) {
    if (Rsys === 0b00_011_0011_1111_110 && Rt === 0b11111) {
      return "isb";
    }
    const systemRegister = systemRegisters[Rsys];
    const name = systemRegister?.name ?? `0b${Rsys.toString(2).padStart(16, "0")}`;
    return `msr\t${name}, x${Rt}`;
  },
  jit(ctx, {Rsys, Rt}) {
    if (Rsys === 0b00_011_0011_1111_110 && Rt === 0b11111) {
      return; // ISB
    }

    const systemRegister = systemRegisters[Rsys];

    if (systemRegister?.store) {
      return systemRegister.store(ctx, ctx.builder.global.get(`x${Rt}`, binaryen.i64));
    }
  },
});

