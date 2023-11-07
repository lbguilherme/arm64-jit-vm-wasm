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

systemRegisters[0b11_000_0100_0000_000] = {
  name: "SPSR_EL1",
  load(ctx) {
    return ctx.builder.global.get("spsr_el1", binaryen.i64);
  },
  store(ctx, value) {
    return ctx.builder.global.set("spsr_el1", value);
  }
};

systemRegisters[0b11_000_0100_0000_001] = {
  name: "ELR_EL1",
  load(ctx) {
    return ctx.builder.global.get("elr_el1", binaryen.i64);
  },
  store(ctx, value) {
    return ctx.builder.global.set("elr_el1", value);
  }
};

systemRegisters[0b11_011_0000_0000_001] = {
  name: "CTR_EL0",
  load(ctx) {
    const dic = 0b0n; // Instruction cache invalidation to the Point of Unification is required for data to instruction coherence.
    const idc = 0b0n; // Data cache clean to the Point of Unification is required for instruction to data coherence, unless CLIDR_EL1.LoC == 0b000 or (CLIDR_EL1.LoUIS == 0b000 && CLIDR_EL1.LoUU == 0b000).
    const cwg = 0b0001n; // No cache write-back implementation.
    const erg = 0b0000n; // No information.
    const dminLine = 0b0010n; // 4 words.
    const l1ip = 0b11n; // Physical Index, Physical Tag (PIPT)
    const iminLine = 0b0010n; // 4 words.
    const value = (dic << 29n) | (idc << 28n) | (cwg << 24n) | (erg << 20n) | (dminLine << 16n) | (l1ip << 14n) | (iminLine << 0n);
    return ctx.builder.i64.const(Number(value & 0xffffffffn), Number(value >> 32n));
  }
};

defineInstruction({
  name: "MRS (Move System register to general-purpose register)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, ["Rsys", 15], ["Rt", 5, { not: 0b11111 }]],
  asm({Rsys, Rt}) {
    const systemRegister = systemRegisters[0b10_000_0000_0000_000 | Rsys];
    const name = systemRegister?.name ?? `#0b1${Rsys.toString(2).padStart(15, "0")}`;
    return `mrs\tx${Rt}, ${name}`;
  },
  jit(ctx, {Rsys, Rt}) {
    const systemRegister = systemRegisters[0b10_000_0000_0000_000 | Rsys];

    if (systemRegister?.load) {
      return ctx.builder.global.set(`x${Rt}`, systemRegister.load(ctx));
    } else {
      return ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.const(0, 0));
    }
  },
});

defineInstruction({
  name: "MSR (Move general-purpose register to System register)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, ["Rsys", 15], ["Rt", 5]],
  asm({Rsys, Rt}) {
    const systemRegister = systemRegisters[0b10_000_0000_0000_000 | Rsys];
    const name = systemRegister?.name ?? `#0b1${Rsys.toString(2).padStart(15, "0")}`;
    return "msr\t"+ [
      name,
      Rt === 31 ? "xzr" : `x${Rt}`
    ].join(", ");
  },
  jit(ctx, {Rsys, Rt}) {
    const systemRegister = systemRegisters[0b10_000_0000_0000_000 | Rsys];

    if (systemRegister?.store) {
      return systemRegister.store(ctx,
        Rt === 31 ? ctx.builder.i64.const(0, 0) : ctx.builder.global.get(`x${Rt}`, binaryen.i64)
      );
    }
  },
});
