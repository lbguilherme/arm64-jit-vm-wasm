import { defineInstruction, immToString } from "../base.js";

const memoryBarrierOptionName: string[] = [];
memoryBarrierOptionName[0b1111] = "sy";
memoryBarrierOptionName[0b1110] = "st";
memoryBarrierOptionName[0b1101] = "ld";
memoryBarrierOptionName[0b1011] = "ish";
memoryBarrierOptionName[0b1010] = "ishst";
memoryBarrierOptionName[0b1001] = "ishld";
memoryBarrierOptionName[0b0111] = "nsh";
memoryBarrierOptionName[0b0110] = "nshst";
memoryBarrierOptionName[0b0101] = "nshld";
memoryBarrierOptionName[0b0011] = "osh";
memoryBarrierOptionName[0b0010] = "oshst";
memoryBarrierOptionName[0b0001] = "oshld";

defineInstruction({
  name: "DMB (Data memory barrier)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, ["CRm", 4], 1, 0, 1, 1, 1, 1, 1, 1],
  asm({CRm}) {
    return `dmb\t${memoryBarrierOptionName[CRm] ?? immToString(CRm)}`;
  },
  jit(ctx) {},
});

defineInstruction({
  name: "DSB (Data synchronization barrier)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, ["CRm", 4], 1, 0, 0, 1, 1, 1, 1, 1],
  asm({CRm}) {
    return `dsb\t${memoryBarrierOptionName[CRm] ?? immToString(CRm)}`;
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
