import { test } from "node:test";
import { strictEqual } from "node:assert";
import { makeCpu, runAsm } from "./helpers.js";

test("initialize", () => {
  const cpu = makeCpu();

  runAsm(cpu, `
    mrs x19, CurrentEL
  `);

  strictEqual(cpu.registers.x19.value, 3n << 2n);
});
