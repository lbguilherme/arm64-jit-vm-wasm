import binaryen from "binaryen";
import { CompilerCtx } from "../../compiler.js";

export function add64(ctx: CompilerCtx, operand1: binaryen.ExpressionRef, operand2: binaryen.ExpressionRef) {
  const operand1Local = ctx.allocLocal(binaryen.i64);
  const operand2Local = ctx.allocLocal(binaryen.i64);
  const resultLocal = ctx.allocLocal(binaryen.i64);

  const code = [
    ctx.builder.local.set(operand1Local, operand1),
    ctx.builder.local.set(operand2Local, operand2),
    ctx.builder.local.set(resultLocal, ctx.builder.i64.add(
      ctx.builder.local.get(operand1Local, binaryen.i64),
      ctx.builder.local.get(operand2Local, binaryen.i64)
    )),
    ctx.builder.global.set("pstate.n",
      ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0))
    ),
    ctx.builder.global.set("pstate.z",
      ctx.builder.i64.eq(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0))
    ),
    // unsigned overflow
    ctx.builder.global.set("pstate.c",
      ctx.builder.i64.lt_u(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.local.get(operand1Local, binaryen.i64))
    ),
    // signed overflow
    ctx.builder.global.set("pstate.v",
      ctx.builder.i32.xor(
        ctx.builder.i64.lt_s(ctx.builder.local.get(operand2Local, binaryen.i64), ctx.builder.i64.const(0, 0)),
        ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.local.get(operand1Local, binaryen.i64))
      )
    )
  ];

  return { resultLocal, code };
}

export function addWithCarry64(ctx: CompilerCtx, operand1: binaryen.ExpressionRef, operand2: binaryen.ExpressionRef, carry: false | true | binaryen.ExpressionRef) {
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
