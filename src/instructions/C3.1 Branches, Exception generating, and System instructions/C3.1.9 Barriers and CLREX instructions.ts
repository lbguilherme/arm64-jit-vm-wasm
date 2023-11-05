import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "DMB (Data memory barrier)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, ["CRm", 4], 1, 0, 1, 1, 1, 1, 1, 1],
  asm({CRm}) {
    const option: string[] = [];
    option[0b1111] = "sy";
    option[0b1110] = "st";
    option[0b1101] = "ld";
    option[0b1011] = "ish";
    option[0b1010] = "ishst";
    option[0b1001] = "ishld";
    option[0b0111] = "nsh";
    option[0b0110] = "nshst";
    option[0b0101] = "nshld";
    option[0b0011] = "osh";
    option[0b0010] = "oshst";
    option[0b0001] = "oshld";
    return `dmb\t${option[CRm] ?? immToString(CRm)}`;
  },
  jit(ctx) {},
});

defineInstruction({
  name: "ISB (Instruction synchronization barrier)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, ["CRm", 4], 1, 1, 0, 1, 1, 1, 1, 1],
  asm({CRm}) {
    if (CRm === 0b1111) {
      return `isb`;
    } else {
      return `isb\t${immToString(CRm)}`;
    }
  },
  jit(ctx) {},
});
