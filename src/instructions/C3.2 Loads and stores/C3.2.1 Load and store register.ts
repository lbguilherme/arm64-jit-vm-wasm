import binaryen from "binaryen";
import { defineInstruction, immToString, signExtend } from "../base.js";

defineInstruction({
  name: "LDR (Load register (PC-relative literal))",
  pattern: [0, ["sf", 1], 0, 1, 1, 0, 0, 0, ["imm19", 19], ["Rt", 5]],
  asm({sf, imm19, Rt}) {
    return "ldr\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      immToString(signExtend(imm19, 19) * 4),
    ].join(", ");
  },
  jit(ctx, {sf, imm19, Rt}) {
  }
});

defineInstruction({
  name: "STR (Store register (immediate offset)) - writeback",
  pattern: [1, ["sf", 1], 1, 1, 1, 0, 0, 0, 0, 0, 0, ["imm9", 9], ["preindex", 1], 1, ["Rn", 5], ["Rt", 5]],
  asm({sf, imm9, preindex, Rn, Rt}) {
    const reg = Rn === 31 ? "sp" : `x${Rn}`;
    const imm = immToString(signExtend(imm9, 9) << (sf ? 3 : 2));
    return "str\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      preindex ? `[${reg}, ${imm}]!` : `[${reg}], ${imm}`
    ].join(", ");
  },
  jit(ctx, {sf, imm9, preindex, Rn, Rt}) {
    const offset = signExtend(imm9, 9) << (sf ? 3 : 2);

    const address = ctx.builder.i32.wrap(Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64));

    const addressLocal = ctx.allocLocal(binaryen.i32);

    return [
      ctx.builder.local.set(addressLocal, address),
      sf === 0
        ? ctx.builder.i32.store(preindex ? offset : 0, 4, ctx.builder.local.get(addressLocal, binaryen.i32), ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt}`, binaryen.i64)))
        : ctx.builder.i64.store(preindex ? offset : 0, 8, ctx.builder.local.get(addressLocal, binaryen.i32), ctx.builder.global.get(`x${Rt}`, binaryen.i64)),
      ctx.builder.local.set(addressLocal,
        ctx.builder.i32.add(
          ctx.builder.local.get(addressLocal, binaryen.i32),
          ctx.builder.i32.const(offset)
        )
      ),
      Rn === 31
        ? ctx.cpu.storeSpFromLocal(ctx.builder, addressLocal)
        : ctx.builder.global.set(`x${Rn}`, ctx.builder.local.get(addressLocal, binaryen.i32))
    ];
  }
});

defineInstruction({
  name: "STR (Store register (immediate offset)) - not writeback",
  pattern: [1, ["sf", 1], 1, 1, 1, 0, 0, 1, 0, 0, ["imm12", 12], ["Rn", 5], ["Rt", 5]],
  asm({sf, imm12, Rn, Rt}) {
    const reg = Rn === 31 ? "sp" : `x${Rn}`;
    const imm = immToString(imm12 << (sf ? 3 : 2));
    return "str\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      imm12 === 0 ? `[${reg}]` : `[${reg}, ${imm}]`
    ].join(", ");
  },
  jit(ctx, {sf, imm12, Rn, Rt}) {
    const offset = imm12 << (sf ? 3 : 2);

    const address = ctx.builder.i32.wrap(Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64));

    return sf === 0
      ? ctx.builder.i32.store(offset, 4, address, ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt}`, binaryen.i64)))
      : ctx.builder.i64.store(offset, 8, address, ctx.builder.global.get(`x${Rt}`, binaryen.i64));
  }
});

defineInstruction({
  name: "LDR (Load register (immediate offset)) - writeback",
  pattern: [1, ["sf", 1], 1, 1, 1, 0, 0, 0, 0, 1, 0, ["imm9", 9], ["preindex", 1], 1, ["Rn", 5], ["Rt", 5]],
  asm({sf, imm9, preindex, Rn, Rt}) {
    const reg = Rn === 31 ? "sp" : `x${Rn}`;
    const imm = immToString(signExtend(imm9, 9) << (sf ? 3 : 2));
    return "ldr\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      preindex ? `[${reg}, ${imm}]!` : `[${reg}], ${imm}`
    ].join(", ");
  },
  jit(ctx, {sf, imm9, preindex, Rn, Rt}) {
    const offset = signExtend(imm9, 9) << (sf ? 3 : 2);

    const address = ctx.builder.i32.wrap(Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64));

    const addressLocal = ctx.allocLocal(binaryen.i32);

    return [
      ctx.builder.local.set(addressLocal, address),
      sf === 0
        ? ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.extend_u(ctx.builder.i32.load(preindex ? offset : 0, 4, address)))
        : ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.load(preindex ? offset : 0, 8, address)),
      ctx.builder.local.set(addressLocal,
        ctx.builder.i32.add(
          ctx.builder.local.get(addressLocal, binaryen.i32),
          ctx.builder.i32.const(offset)
        )
      ),
      Rn === 31
        ? ctx.cpu.storeSpFromLocal(ctx.builder, addressLocal)
        : ctx.builder.global.set(`x${Rn}`, ctx.builder.local.get(addressLocal, binaryen.i32))
    ];
  }
});

defineInstruction({
  name: "LDR (Load register (immediate offset)) - not writeback",
  pattern: [1, ["sf", 1], 1, 1, 1, 0, 0, 1, 0, 1, ["imm12", 12], ["Rn", 5], ["Rt", 5]],
  asm({sf, imm12, Rn, Rt}) {
    const reg = Rn === 31 ? "sp" : `x${Rn}`;
    const imm = immToString(imm12 << (sf ? 3 : 2));
    return "ldr\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      imm12 === 0 ? `[${reg}]` : `[${reg}, ${imm}]`
    ].join(", ");
  },
  jit(ctx, {sf, imm12, Rn, Rt}) {
    const offset = imm12 << (sf ? 3 : 2);

    const address = ctx.builder.i32.wrap(Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64));

    return sf === 0
      ? ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.extend_u(ctx.builder.i32.load(offset, 4, address)))
      : ctx.builder.global.set(`x${Rt}`, ctx.builder.i64.load(offset, 8, address));
  }
});
