import { describe, test } from "vitest";
import { runSingleInstructionTest } from "../helpers.js";

describe("sub", () => {
  test.each([
    { asm: "sub x0, x0, #1", init: { x0: 10n }, expected: { x0: 9n } },
    { asm: "sub x0, x0, #2", init: { x0: 1n }, expected: { x0: -1n } },
    { asm: "sub x1, x2, #0xa", init: { x1: 20n, x2: 100n }, expected: { x1: 90n, x2: 100n } },
    { asm: "sub sp, x2, #0xa", init: { sp_el0: 20n, x2: 100n }, expected: { sp_el0: 90n, x2: 100n } },
    { asm: "sub x1, sp, #0xa", init: { x1: 20n, sp_el0: 100n }, expected: { x1: 90n, sp_el0: 100n } },
    { asm: "sub sp, sp, #2", init: { sp_el0: 1n }, expected: { sp_el0: -1n } },
    { asm: "sub w0, w0, #1", init: { x0: 10n }, expected: { x0: 9n } },
    { asm: "sub w0, w1, #0xa", init: { x1: 5n }, expected: { x0: (2n << 31n) - 5n } },
    { asm: "sub x0, x0, #3, lsl #12", init: { x0: (3n << 12n) + 14n }, expected: { x0: 14n } },
  ])('$asm | $init -> $expected', runSingleInstructionTest);
});

describe("add", () => {
  test.each([
    { asm: "add x0, x0, #1", init: { x0: 10n }, expected: { x0: 11n } },
    { asm: "add x0, x0, #2", init: { x0: -1n }, expected: { x0: 1n } },
    { asm: "add x1, x2, #0xa", init: { x1: 20n, x2: 100n }, expected: { x1: 110n, x2: 100n } },
    { asm: "add sp, x2, #0xa", init: { sp_el0: 20n, x2: 100n }, expected: { sp_el0: 110n, x2: 100n } },
    { asm: "add x1, sp, #0xa", init: { x1: 20n, sp_el0: 100n }, expected: { x1: 110n, sp_el0: 100n } },
    { asm: "add sp, sp, #2", init: { sp_el0: -1n }, expected: { sp_el0: 1n } },
    { asm: "add wsp, wsp, #2", init: { sp_el0: -1n }, expected: { sp_el0: 1n } },
    { asm: "add w0, w0, #1", init: { x0: 10n }, expected: { x0: 11n } },
    { asm: "add w0, w1, #0xa", init: { x1: (2n << 31n) - 5n }, expected: { x0: 5n } },
    { asm: "add x0, x0, #3, lsl #12", init: { x0: 14n }, expected: { x0: (3n << 12n) + 14n } },
    { asm: "add x0, x0, #0xf", init: { x0: (1n << 64n) - 10n }, expected: { x0: 5n } },
    { asm: "add w0, w0, #0xf", init: { x0: (1n << 32n) - 10n }, expected: { x0: 5n } },
    { asm: "add w0, w0, #1", init: { x0: (1n << 36n) + 1n }, expected: { x0: 2n } },
  ])('$asm | $init -> $expected', runSingleInstructionTest);
});
