import { defineInstruction, immToString, signExtend } from "../base.js";

defineInstruction({
  name: "ADRP (Compute address of 4KB page at a PC-relative offset)",
  pattern: [1, ["immlo", 2], 1, 0, 0, 0, 0, ["immhi", 19], ["Rd", 5]],
  asm({immlo, immhi, Rd}) {
    return "adrp\t" + [
      `x${Rd}`,
      immToString(BigInt(signExtend((immhi << 2) | immlo, 21)) << 12n),
    ].join(", ");
  },
  jit(ctx, {immlo, immhi, Rd}) {
    const base = BigInt(ctx.pc & (-1 << 12));
    const imm = BigInt(signExtend((immhi << 2) | immlo, 21)) << 12n;
    const value = base + imm;

    return ctx.builder.global.set(`x${Rd}`,
      ctx.builder.i64.const(Number(value & 0xffffffffn), Number(value >> 32n))
    );
  }
});

defineInstruction({
  name: "ADR (Compute address of label at a PC-relative offset.)",
  pattern: [0, ["immlo", 2], 1, 0, 0, 0, 0, ["immhi", 19], ["Rd", 5]],
  asm({immlo, immhi, Rd}) {
    return "adr\t" + [
      `x${Rd}`,
      immToString(signExtend((immhi << 2) | immlo, 21)),
    ].join(", ");
  },
  jit(ctx, {immlo, immhi, Rd}) {
    const base = BigInt(ctx.pc);
    const imm = BigInt(signExtend((immhi << 2) | immlo, 21));
    const value = base + imm;

    return ctx.builder.global.set(`x${Rd}`,
      ctx.builder.i64.const(Number(value & 0xffffffffn), Number(value >> 32n))
    );
  }
});
