import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "HINT",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, ["CRm", 4], ["op2", 3], 1, 1, 1, 1, 1],
  asm({CRm, op2}) {
    const imm = (CRm << 3) | op2;
    switch (imm) {
      case 0b0000_000: return "nop";
      case 0b0000_001: return "yield";
      case 0b0000_010: return "wfe";
      case 0b0000_011: return "wfi";
      case 0b0000_100: return "sev";
      case 0b0000_101: return "sevl";
    }
    return `hint\t${immToString(imm)}`;
  },
  jit() {}
});
