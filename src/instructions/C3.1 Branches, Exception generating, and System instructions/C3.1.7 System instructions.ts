import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "SYS (System instruction)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, ["op1", 3], ["CRn", 4], ["CRm", 4], ["op2", 3], ["Rt", 5]],
  asm({op1, CRn, CRm, op2, Rt}) {
    return `sys\t` + [
      immToString(op1),
      `C${CRn}`,
      `C${CRm}`,
      immToString(op2),
      ...(Rt === 31 ? [] : [`x${Rt}`])
    ].join(", ");
  },
  jit(ctx) {},
});
