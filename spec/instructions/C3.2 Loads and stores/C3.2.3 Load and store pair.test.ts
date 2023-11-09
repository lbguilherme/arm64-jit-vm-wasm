import { describe, test } from "vitest";
import { runSingleInstructionTest } from "../helpers.js";

describe("sub", () => {
  test.each([
    { asm: "stp x1, x2, [x3]", init: { x1: 10n, x2: 20n, x3: 30n }, expected: { x1: 10n, x2: 20n, x3: 30n, mem64: { [30]: 10n, [38]: 20n } } },
    { asm: "stp x1, x2, [x3, #8]", init: { x1: 10n, x2: 20n, x3: 30n }, expected: { x1: 10n, x2: 20n, x3: 30n, mem64: { [38]: 10n, [46]: 20n } } },
  ])('$asm | $init -> $expected', runSingleInstructionTest);
});
