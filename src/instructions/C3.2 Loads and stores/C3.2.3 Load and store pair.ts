import binaryen from "binaryen";
import { defineInstruction, immToString, signExtend } from "../base.js";

defineInstruction({
  name: "STP (Store Pair)",
  pattern: [["sf", 1], 0, 1, 0, 1, 0, 0, ["mode", 2], 0, ["imm7", 7], ["Rt2", 5, { not: 0b11111 }], ["Rn", 5], ["Rt", 5, { not: 0b11111 }]],
  asm({sf, mode, imm7, Rt2, Rn, Rt}) {
    const reg = Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`;
    const imm = immToString(signExtend(imm7, 7) << (sf ? 3 : 2));
    return "stp\t" + [
      `${sf ? "x" : "w"}${Rt}`,
      `${sf ? "x" : "w"}${Rt2}`,
      mode === 1
        ? `[${reg}], ${imm}`
        : mode === 3
          ? `[${reg}, ${imm}]!`
          : imm7 === 0 ? `[${reg}]` : `[${reg}, ${imm}]`
    ].join(", ");
  },
  jit(ctx, {sf, mode, imm7, Rt2, Rn, Rt}) {
    const wback = mode === 3 || mode === 1;
    const postindex = mode === 3;
    const scale = sf ? 3 : 2;
    const offset = signExtend(imm7, 7) << scale;

    let address = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    if (!postindex) {
      address = ctx.builder.i64.add(address, ctx.builder.i64.const(offset, 0));
    }

    const addressLocal = ctx.allocLocal(binaryen.i32);

    return [
      ctx.builder.local.set(addressLocal, ctx.builder.i32.wrap(address)),
      ...(sf === 0 ? [
        ctx.builder.i32.store(0, 4, ctx.builder.local.get(addressLocal, binaryen.i32), ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt}`, binaryen.i64))),
        ctx.builder.i32.store(4, 4, ctx.builder.local.get(addressLocal, binaryen.i32), ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rt2}`, binaryen.i64))),
      ] : [
        ctx.builder.i64.store(0, 8, ctx.builder.local.get(addressLocal, binaryen.i32), ctx.builder.global.get(`x${Rt}`, binaryen.i64)),
        ctx.builder.i64.store(8, 8, ctx.builder.local.get(addressLocal, binaryen.i32), ctx.builder.global.get(`x${Rt2}`, binaryen.i64)),
      ]),
      ...(wback ? [
        ...(postindex ? [
          ctx.builder.local.set(addressLocal,
            ctx.builder.i32.add(
              ctx.builder.local.get(addressLocal, binaryen.i32),
              ctx.builder.i32.const(offset)
            )
          ),
        ] : []),
        Rn === 31
          ? ctx.cpu.storeSpFromLocal(ctx.builder, addressLocal)
          : ctx.builder.global.set(`x${Rn}`, ctx.builder.local.get(addressLocal, binaryen.i32))
      ] : [])
    ];
  }
});
