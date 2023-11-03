import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "MOVZ (Move wide with zero)",
  pattern: [["sf", 1], 1, 0, 1, 0, 0, 1, 0, 1, ["hw", 2], ["imm16", 16], ["Rd", 5]],
  asm({sf, hw, imm16, Rd}) {
    return (hw === 0 || imm16 === 0 ? "mov\t" : "movz\t") + [
      `${sf ? "x" : "w"}${Rd}`,
      immToString(imm16),
      ...(hw === 0 || imm16 === 0 ? [] : [`lsl #${hw * 16}`]),
    ].join(", ");
  },
  jit(ctx, {hw, imm16, Rd}) {
    const value = BigInt(imm16) << BigInt(hw * 16);

    return ctx.builder.global.set(`x${Rd}`,
      ctx.builder.i64.const(Number(value & 0xffffffffn), Number(value >> 32n))
    );
  }
});
