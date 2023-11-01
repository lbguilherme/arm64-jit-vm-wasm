import binaryen from "binaryen";
import { defineInstruction, immToString } from "./base.js";
import { CompilerCtx } from "../compiler.js";
import { condName } from "./control_flow.js";

function add64(ctx: CompilerCtx, operand1: binaryen.ExpressionRef, operand2: binaryen.ExpressionRef) {
  const resultLocal = ctx.allocLocal(binaryen.i64);

  ctx.emit(ctx.builder.local.set(resultLocal, ctx.builder.i64.add(operand1, operand2)));

  const n = ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0));
  const z = ctx.builder.i64.eq(ctx.builder.local.get(resultLocal, binaryen.i64), ctx.builder.i64.const(0, 0));
  const c = ctx.builder.i64.lt_u(ctx.builder.local.get(resultLocal, binaryen.i64), operand1); // unsigned overflow
  const v = ctx.builder.i32.xor(
    ctx.builder.i64.lt_s(operand2, ctx.builder.i64.const(0, 0)),
    ctx.builder.i64.lt_s(ctx.builder.local.get(resultLocal, binaryen.i64), operand1)
  ); // signed overflow

  ctx.emit(ctx.cpu.storePstateN(ctx.builder, n));
  ctx.emit(ctx.cpu.storePstateZ(ctx.builder, z));
  ctx.emit(ctx.cpu.storePstateC(ctx.builder, c));
  ctx.emit(ctx.cpu.storePstateV(ctx.builder, v));

  return resultLocal;
}

function addWithCarry64(ctx: CompilerCtx, operand1: binaryen.ExpressionRef, operand2: binaryen.ExpressionRef, carry: false | true | binaryen.ExpressionRef) {
  if (carry === false) {
    return add64(ctx, operand1, operand2);
  }

  const previousCarryLocal = ctx.allocLocal(binaryen.i32);
  const previousOverflowLocal = ctx.allocLocal(binaryen.i32);

  const firstStepResultLocal = add64(ctx, operand1, operand2);

  ctx.emit(ctx.builder.local.set(previousCarryLocal, ctx.cpu.loadPstateC(ctx.builder)));
  ctx.emit(ctx.builder.local.set(previousOverflowLocal, ctx.cpu.loadPstateV(ctx.builder)));

  const resultLocal = add64(ctx, ctx.builder.local.get(firstStepResultLocal, binaryen.i64), carry === true ? ctx.builder.i64.const(1, 0) : carry);

  ctx.emit(ctx.cpu.storePstateC(ctx.builder,
    ctx.builder.i32.xor(
      ctx.cpu.loadPstateC(ctx.builder),
      ctx.builder.local.get(previousCarryLocal, binaryen.i32)
    )
  ));

  ctx.emit(ctx.cpu.storePstateV(ctx.builder,
    ctx.builder.i32.xor(
      ctx.cpu.loadPstateV(ctx.builder),
      ctx.builder.local.get(previousOverflowLocal, binaryen.i32)
    )
  ));

  ctx.freeLocal(firstStepResultLocal);
  ctx.freeLocal(previousCarryLocal);
  ctx.freeLocal(previousOverflowLocal);

  return resultLocal;
}

defineInstruction({
  name: "CCMP (immediate)",
  pattern: [["sf", 1], 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, ["imm5", 5], ["cond", 4], 1, 0, ["Rn", 5], 0, ["nzcv", 4]],
  asm({sf, imm5, cond, Rn, nzcv}) {
    return `ccmp ${sf ? "x" : "w"}${Rn}, ${immToString(imm5)}, ${immToString(nzcv)}, ${condName(cond)}`;
  },
  jit(ctx) {
    // TODO
  }
});

defineInstruction({
  name: "SUBS or CMP (immediate)",
  pattern: [["sf", 1], 1, 1, 1, 0, 0, 0, 1, 0, ["sh", 1], ["imm12", 12], ["Rn", 5], ["Rd", 5]],
  asm({sf, sh, imm12, Rn, Rd}) {
    return `${Rd === 31 ? `cmp` : `subs ${sf ? "x" : "w"}${Rd}`} ${Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`}, ${immToString(imm12)}${sh ? ", lsl #12" : ""}`;
  },
  jit(ctx, {sf, sh, imm12, Rn, Rd}) {
    if (sf === 0) {
      throw new Error("32-bit SUBS not implemented");
    }
    const operand1 = Rn === 31 ? ctx.cpu.loadSp(ctx.builder) : ctx.cpu.loadX(ctx.builder, Rn);
    const operand2 = ctx.builder.i64.const(~(sh ? imm12 << 12 : imm12), 0);
    const result = addWithCarry64(ctx, operand1, operand2, true);
    if (Rd !== 31) {
      ctx.emit(ctx.cpu.storeX(ctx.builder, Rd, ctx.builder.local.get(result, binaryen.i64)));
    }
    ctx.freeLocal(result);
  }
});
