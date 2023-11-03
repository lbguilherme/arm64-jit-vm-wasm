import { defineInstruction, immToString, signExtend } from "../base.js";

defineInstruction({
  name: "LDR (Load register (PC-relative literal))",
  pattern: [0, ["sf", 1], 0, 1, 1, 0, 0, 0, ["imm19", 19], ["Rt", 5]],
  asm({sf, imm19, Rt}) {
    return "ldr\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      immToString(signExtend(imm19, 19) * 4),
    ].join(", ");
  },
  jit(ctx, {sf, imm19, Rt}) {
  }
});
