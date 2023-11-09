import binaryen from "binaryen";
import { defineInstruction } from "../base.js";
import { condEval, condName } from "../common/cond.js";

defineInstruction({
  name: "CSINC / CINC / CSET",
  pattern: [["sf", 1], 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, ["Rm", 5], ["cond", 4], 0, 1, ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, cond, Rn, Rd}) {
    if (Rm === 31 && Rn === 31 && (cond & 0b1110) !== 0b1110) {
      return "cset\t" + [
        `${sf ? "x" : "w"}${Rd == 31 ? "zr" : Rd}`,
        condName(cond ^ 0b1000)
      ].join(", ");
    } else if (Rm === Rn && (cond & 0b1110) !== 0b1110) {
      return "cinc\t" + [
        `${sf ? "x" : "w"}${Rd == 31 ? "zr" : Rd}`,
        `${sf ? "x" : "w"}${Rn == 31 ? "zr" : Rn}`,
        condName(cond ^ 0b1000)
      ].join(", ");
    } else {
      return "csinc\t" + [
        `${sf ? "x" : "w"}${Rd == 31 ? "zr" : Rd}`,
        `${sf ? "x" : "w"}${Rn == 31 ? "zr" : Rn}`,
        `${sf ? "x" : "w"}${Rm == 31 ? "zr" : Rm}`,
        condName(cond)
      ].join(", ");
    }
  },
  jit(ctx, {sf, Rm, cond, Rn, Rd}) {
    if (Rd === 31) return;
    
    if (sf) {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.select(
        condEval(ctx.builder, cond),
        Rn === 31 ? ctx.builder.i64.const(0, 0) : ctx.builder.global.get(`x${Rn}`, binaryen.i64),
        Rm === 31 ? ctx.builder.i64.const(1, 0) : ctx.builder.i64.add(
          ctx.builder.global.get(`x${Rm}`, binaryen.i64),
          ctx.builder.i64.const(1, 0)
        )
      ));
    } else {
      return ctx.builder.global.set(`x${Rd}`, ctx.builder.i64.extend_u(ctx.builder.select(
        condEval(ctx.builder, cond),
        Rn === 31 ? ctx.builder.i32.const(0) : ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rn}`, binaryen.i64)),
        Rm === 31 ? ctx.builder.i32.const(1) : ctx.builder.i32.add(
          ctx.builder.i32.wrap(ctx.builder.global.get(`x${Rm}`, binaryen.i64)),
          ctx.builder.i32.const(1)
        )
      )));
    }
  }
});
