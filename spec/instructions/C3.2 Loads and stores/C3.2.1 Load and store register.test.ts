import { describe, test } from "vitest";
import { runSingleInstructionTest } from "../helpers.js";

describe("str", () => {
  test.each([
    { asm: "str x1, [x2]", init: { x1: 10n, x2: 30n }, expected: { x1: 10n, x2: 30n, mem64: { [30]: 10n } } },
    { asm: "str x1, [x2, #8]", init: { x1: 10n, x2: 30n }, expected: { x1: 10n, x2: 30n, mem64: { [38]: 10n } } },
    { asm: "str x1, [sp]", init: { x1: 10n, sp_el0: 30n }, expected: { x1: 10n, sp_el0: 30n, mem64: { [30]: 10n } } },
    { asm: "str x1, [sp, #8]", init: { x1: 10n, sp_el0: 30n }, expected: { x1: 10n, sp_el0: 30n, mem64: { [38]: 10n } } },
    { asm: "str x1, [x2, #0x7ff8]", init: { x1: 10n, x2: 30n }, expected: { x1: 10n, x2: 30n, mem64: { [30 + 0x7FF8]: 10n } } },
    { asm: "str w1, [x2]", init: { x1: 10n, x2: 30n }, expected: { x1: 10n, x2: 30n, mem32: { [30]: 10 } } },
  ])('$asm | $init -> $expected', runSingleInstructionTest);
});

describe("ldr", () => {
  test.each([
    { asm: "ldr x1, [x2]", init: { x1: 20n, x2: 30n, mem64: { [30]: 10n } }, expected: { x1: 10n, x2: 30n, mem64: { [30]: 10n } } },
    { asm: "ldr x1, [x2, #8]", init: { x1: 20n, x2: 30n, mem64: { [38]: 10n } }, expected: { x1: 10n, x2: 30n, mem64: { [38]: 10n } } },
    { asm: "ldr x1, [sp]", init: { x1: 20n, sp_el0: 30n, mem64: { [30]: 10n } }, expected: { x1: 10n, sp_el0: 30n, mem64: { [30]: 10n } } },
    { asm: "ldr x1, [sp, #8]", init: { x1: 20n, sp_el0: 30n, mem64: { [38]: 10n } }, expected: { x1: 10n, sp_el0: 30n, mem64: { [38]: 10n } } },
    { asm: "ldr x1, [x2, #0x7ff8]", init: { x1: 20n, x2: 30n, mem64: { [30 + 0x7FF8]: 10n } }, expected: { x1: 10n, x2: 30n } },
    { asm: "ldr w1, [x2]", init: { x1: 20n, x2: 30n, mem32: { [30]: 10 } }, expected: { x1: 10n, x2: 30n } },
    { asm: "ldr w1, [x2, #4]", init: { x1: 20n, x2: 30n, mem32: { [34]: -1 } }, expected: { x1: (1n << 32n) - 1n, x2: 30n } },
  ])('$asm | $init -> $expected', runSingleInstructionTest);
});
