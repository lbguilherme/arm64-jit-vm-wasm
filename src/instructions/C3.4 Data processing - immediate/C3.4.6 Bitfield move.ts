import binaryen from "binaryen";
import { defineInstruction, immToString } from "../base.js";
import { decodeBitMasks } from "../common/bitmasks.js";

function isBfxPreferred(sf: number, uns: number, imms: number, immr: number) {
  if (imms < immr || imms === ((sf << 5) & 0b11111)) {
    return false;
  }

  if (immr === 0) {
    if (sf === 0 && (imms === 0b111 || imms === 0b1111)) {
      return false;
    }

    if (sf === 1 && uns === 1 && (imms === 0b111 || imms === 0b1111 || imms === 0b11111)) {
      return false;
    }
  }

  return true;
}

defineInstruction({
  name: "UBFM (Unsigned bitfield move (32-bit))",
  pattern: [["sf", 1], 1, 0, 1, 0, 0, 1, 1, 0, ["N", 1], ["immr", 6], ["imms", 6], ["Rn", 5], ["Rd", 5]],
  asm({sf, N, immr, imms, Rn, Rd}) {
    if (imms !== 0b011111 && imms + 1 === immr) {
      return "lsl\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        `${sf ? "x" : "w"}${Rn}`,
        immToString(31 - imms),
      ].join(", ");
    } else if (imms !== 0b111111 && imms + 1 === immr) {
      return "lsl\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        `${sf ? "x" : "w"}${Rn}`,
        immToString(63 - imms),
      ].join(", ");
    } else if (imms === 0b011111 || imms === 0b111111) {
      return "lsr\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        `${sf ? "x" : "w"}${Rn}`,
        immToString(immr),
      ].join(", ");
    } else if (imms < immr) {
      return "ubfm\t" + [ // ubfiz
        `${sf ? "x" : "w"}${Rd}`,
        `${sf ? "x" : "w"}${Rn}`,
        immToString(immr),
        immToString(imms),
      ].join(", ");
    } else if (isBfxPreferred(sf, 1, imms, immr)) {
      return "ubfx\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        `${sf ? "x" : "w"}${Rn}`,
        immToString(immr),
        immToString(imms-immr+1),
      ].join(", ");
    } else {
      // TODO: uxtb, uxth
      return "ubfm\t" + [
        `${sf ? "x" : "w"}${Rd}`,
        `${sf ? "x" : "w"}${Rn}`,
        immToString(immr),
        immToString(imms),
      ].join(", ");
    }
  },
  jit(ctx, {sf, N, immr, imms, Rn, Rd}) {
    const [wmask, tmask] = decodeBitMasks(N, imms, immr, false, sf ? 64 : 32);
    const mask = wmask & tmask;

    if (sf === 0) {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.extend_u(
        ctx.builder.i32.and(
          ctx.builder.i32.rotr(
            ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64)),
            ctx.builder.i32.const(immr)
          ),
          ctx.builder.i32.const(Number(mask & 0xffffffffn))
        )
      ));
    } else {
      return ctx.builder.global.set(`x${Rd}`,
        ctx.builder.i64.and(
          ctx.builder.i64.rotr(
            ctx.builder.global.get(`x${Rn}`, binaryen.i64),
            ctx.builder.i64.const(immr, 0)
          ),
          ctx.builder.i64.const(Number(mask & 0xffffffffn), Number(mask >> 32n))
        )
      );
    }
  }
});
