import binaryen from "binaryen";
import { defineInstruction, immToString } from "./base.js";
import { CompilerCtx } from "../compiler.js";
import { condEval, condName } from "./control_flow.js";

function add64(ctx: CompilerCtx, operand1: binaryen.ExpressionRef, operand2: binaryen.ExpressionRef) {
  const resultLocal = ctx.allocLocal(binaryen.i64);

  const code = [
    ctx.builder.local.set(resultLocal, ctx.builder.i64.add(operand1, operand2)),
    ctx.builder.global.set("pstate.n",
      ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0))
    ),
    ctx.builder.global.set("pstate.z",
      ctx.builder.i64.eq(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0))
    ),
    // unsigned overflow
    ctx.builder.global.set("pstate.c",
      ctx.builder.i64.lt_u(ctx.builder.local.get(resultLocal, binaryen.i64), operand1)
    ),
    // signed overflow
    ctx.builder.global.set("pstate.v",
      ctx.builder.i32.xor(
        ctx.builder.i64.lt_s(operand2, ctx.builder.i64.const(0, 0)),
        ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), operand1)
      )
    )
  ];

  return { resultLocal, code };
}

function addWithCarry64(ctx: CompilerCtx, operand1: binaryen.ExpressionRef, operand2: binaryen.ExpressionRef, carry: false | true | binaryen.ExpressionRef) {
  if (carry === false) {
    return add64(ctx, operand1, operand2);
  }

  const previousCarryLocal = ctx.allocLocal(binaryen.i32);
  const previousOverflowLocal = ctx.allocLocal(binaryen.i32);

  const { resultLocal: firstStepResultLocal, code: firstStepCode } = add64(ctx, operand1, operand2);

  const newOperand1 = ctx.builder.local.get(firstStepResultLocal, binaryen.i64);
  const newOperand2 = carry === true ? ctx.builder.i64.const(1, 0) : carry;

  const { resultLocal, code: secondStepCode } = add64(ctx, newOperand1, newOperand2);

  const code = [
    ...firstStepCode,
    ctx.builder.local.set(previousCarryLocal, ctx.builder.global.get("pstate.c", binaryen.i32)),
    ctx.builder.local.set(previousOverflowLocal, ctx.builder.global.get("pstate.v", binaryen.i32)),
    ...secondStepCode,
    ctx.builder.global.set("pstate.c",
      ctx.builder.i32.xor(
        ctx.builder.global.get("pstate.c", binaryen.i32),
        ctx.builder.local.get(previousCarryLocal, binaryen.i32)
      )
    ),
    ctx.builder.global.set("pstate.v",
      ctx.builder.i32.xor(
        ctx.builder.global.get("pstate.v", binaryen.i32),
        ctx.builder.local.get(previousOverflowLocal, binaryen.i32)
      )
    )
  ];

  return { resultLocal, code };
}

defineInstruction({
  name: "CCMP (immediate)",
  pattern: [["sf", 1], 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, ["imm5", 5], ["cond", 4], 1, 0, ["Rn", 5], 0, ["nzcv", 4]],
  asm({sf, imm5, cond, Rn, nzcv}) {
    return `ccmp ${sf ? "x" : "w"}${Rn}, ${immToString(imm5)}, ${immToString(nzcv)}, ${condName(cond)}`;
  },
  jit(ctx, {sf, imm5, cond, Rn, nzcv}) {
    if (sf === 0) {
      throw new Error("32-bit SUBS not implemented");
    }
    // ctx.emit(
    //   ctx.builder.if(
    //     condEval(ctx, cond),

    //   )
    // )
    // TODO
  }
});

defineInstruction({
  name: "SUBS or CMP (immediate)",
  pattern: [["sf", 1], 1, 1, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, sh, imm12, Rn, Rd}) {
    return `${Rd === 31 ? `cmp` : `subs ${sf ? "x" : "w"}${Rd}`} ${Rn === 31 ? (sf ? "pstate.sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`}, ${immToString(imm12)}${sh ? ", lsl #12" : ""}`;
  },
  jit(ctx, {sf, sh, imm12, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit SUBS not implemented");
    }
    const operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.builder.global.get(`x${Rn}`, binaryen.i64);
    const operand2 = ctx.builder.i64.const(~(sh ? imm12 << 12 : imm12), 0);
    const { resultLocal, code } = addWithCarry64(ctx, operand1, operand2, true);
    return [
      ...code,
      ...(Rd === 31 ? [] : [
        ctx.builder.global.set(`x${Rd}`, ctx.builder.local.get(resultLocal, binaryen.i64))
      ])
    ];
  }
});
