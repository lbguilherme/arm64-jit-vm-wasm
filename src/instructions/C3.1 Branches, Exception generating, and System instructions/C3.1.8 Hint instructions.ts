import { defineInstruction } from "../base.js";

defineInstruction({
  name: "NOP (No operation)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  asm() {
    return `nop`;
  },
  jit() {}
});

defineInstruction({
  name: "YIELD (Yield hint)",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  asm() {
    return `yield`;
  },
  jit() {}
});
