import { test } from "node:test";
import { strictEqual } from "node:assert";
import { makeCpu, runAsm } from "./helpers.js";

test("read CurrentEL", () => {
  const cpu = makeCpu();

  runAsm(cpu, `
    mrs x19, CurrentEL
    ret
  `);

  strictEqual(cpu.registers.x19.value, 1n << 2n);
});

test("factorial", () => {
  const cpu = makeCpu();

  cpu.registers.x0.value = 8n;

  runAsm(cpu, `
    _Z4factx:                               // @_Z4factx
      sub     sp, sp, #48
      /*
      stp     x29, x30, [sp, #32]             // 16-byte Folded Spill
      add     x29, sp, #32
      str     x0, [sp, #16]
      ldr     x8, [sp, #16]
      subs    x8, x8, #0
      cset    w8, ne
      tbnz    w8, #0, .LBB0_2
      b       .LBB0_1
    .LBB0_1:
      mov     x8, #1                          // =0x1
      stur    x8, [x29, #-8]
      b       .LBB0_3
    .LBB0_2:
      ldr     x8, [sp, #16]
      str     x8, [sp, #8]                    // 8-byte Folded Spill
      ldr     x8, [sp, #16]
      subs    x0, x8, #1
      bl      _Z4factx
      ldr     x8, [sp, #8]                    // 8-byte Folded Reload
      mul     x8, x8, x0
      stur    x8, [x29, #-8]
      b       .LBB0_3
    .LBB0_3:
      ldur    x0, [x29, #-8]
      ldp     x29, x30, [sp, #32]             // 16-byte Folded Reload
      add     sp, sp, #48
      */
      ret

  `);

  strictEqual(cpu.registers.x0.value, 8n);
  // strictEqual(cpu.registers.x0.value, 40320n);
  strictEqual(cpu.registers.sp_el0.value, BigInt(cpu.memory.buffer.byteLength) - 48n);
});

test("factorial (optimized)", () => {
  const cpu = makeCpu();

  cpu.registers.x0.value = 15n;

  runAsm(cpu, `
    _Z4factx:                               // @_Z4factx
      mov     x8, x0
      mov     w0, #1                          // =0x1
      cbz     x8, .LBB0_2
    .LBB0_1:                                // =>This Inner Loop Header: Depth=1
      sub     x9, x8, #1
      mul     x0, x8, x0
      mov     x8, x9
      cbnz    x8, .LBB0_1
    .LBB0_2:
      ret
  `);

  strictEqual(cpu.registers.x0.value, 1307674368000n);
});
