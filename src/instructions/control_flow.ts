import binaryen from "binaryen";
import { defineInstruction, immToString } from "./base.js";
import { CompilerCtx } from "../compiler.js";

export function condName(cond: number) {
  switch (cond) {
    case 0b0000: return "eq";
    case 0b0001: return "ne";
    case 0b0010: return "cs";
    case 0b0011: return "cc";
    case 0b0100: return "mi";
    case 0b0101: return "pl";
    case 0b0110: return "vs";
    case 0b0111: return "vc";
    case 0b1000: return "hi";
    case 0b1001: return "ls";
    case 0b1010: return "ge";
    case 0b1011: return "lt";
    case 0b1100: return "gt";
    case 0b1101: return "le";
    case 0b1110: return "al";
    case 0b1111: return "al";
  }
  throw new Error("Invalid condition: 0b" + cond.toString(2));
}

export function condEval(ctx: CompilerCtx, cond: number) {
  switch (cond) {
    case 0b0000: return ctx.builder.global.get("pstate.z", binaryen.i32);
    case 0b0001: return ctx.builder.i32.eqz(ctx.builder.global.get("pstate.z", binaryen.i32));
    case 0b0010: return ctx.builder.global.get("pstate.c", binaryen.i32);
    case 0b0011: return ctx.builder.i32.eqz(ctx.builder.global.get("pstate.c", binaryen.i32));
    case 0b0100: return ctx.builder.global.get("pstate.n", binaryen.i32);
    case 0b0101: return ctx.builder.i32.eqz(ctx.builder.global.get("pstate.n", binaryen.i32));
    case 0b0110: return ctx.builder.global.get("pstate.v", binaryen.i32);
    case 0b0111: return ctx.builder.i32.eqz(ctx.builder.global.get("pstate.v", binaryen.i32));
    case 0b1000: return ctx.builder.i32.and(
      ctx.builder.global.get("pstate.c", binaryen.i32),
      ctx.builder.i32.eqz(ctx.builder.global.get("pstate.z", binaryen.i32))
    );
    case 0b1001: return ctx.builder.i32.or(
      ctx.builder.i32.eqz(ctx.builder.global.get("pstate.c", binaryen.i32)),
      ctx.builder.global.get("pstate.z", binaryen.i32)
    );
    case 0b1010: return ctx.builder.i32.eq(
      ctx.builder.global.get("pstate.n", binaryen.i32),
      ctx.builder.global.get("pstate.v", binaryen.i32)
    );
    case 0b1011: return ctx.builder.i32.ne(
      ctx.builder.global.get("pstate.n", binaryen.i32),
      ctx.builder.global.get("pstate.v", binaryen.i32)
    );
    case 0b1100: return ctx.builder.i32.and(
      ctx.builder.i32.eqz(ctx.builder.global.get("pstate.z", binaryen.i32)),
      ctx.builder.i32.eq(
        ctx.builder.global.get("pstate.n", binaryen.i32),
        ctx.builder.global.get("pstate.v", binaryen.i32)
      )
    );
    case 0b1101: return ctx.builder.i32.or(
      ctx.builder.i32.ne(
        ctx.builder.global.get("pstate.n", binaryen.i32),
        ctx.builder.global.get("pstate.v", binaryen.i32)
      ),
      ctx.builder.global.get("pstate.z", binaryen.i32)
    );
    case 0b1110: return ctx.builder.i32.const(1);
    case 0b1111: return ctx.builder.i32.const(1);
  }
  throw new Error("Invalid condition: 0b" + cond.toString(2));
}

defineInstruction({
  name: "Nop",
  pattern: [1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  asm() {
    return `nop`;
  },
});

defineInstruction({
  name: "Branch",
  pattern: [0, 0, 0, 1, 0, 1, ["imm26", 26]],
  asm({imm26}) {
    return `b ${immToString((imm26 * 4) + 4)}`;
  },
  jit(ctx, {imm26}) {
    ctx.branch(ctx.pc + imm26 * 4);
  }
});

defineInstruction({
  name: "Branch with Link",
  pattern: [1, 0, 0, 1, 0, 1, ["imm26", 26]],
  asm({imm26}) {
    return `bl ${immToString((imm26 * 4) + 4)}`;
  },
  jit(ctx, {imm26}) {
    const funcIndex = ctx.getFuncIndex(ctx.pc + imm26 * 4);

    return [
      ctx.builder.global.set("x30", ctx.builder.i64.const(ctx.pc + 4, 0)),
      ctx.builder.call_indirect(
        "funcTable",
        ctx.builder.i32.const(funcIndex),
        [],
        binaryen.none,
        binaryen.none
      )
    ];
  },
});

defineInstruction({
  name: "Branch condition",
  pattern: [0, 1, 0, 1, 0, 1, 0, 0, ["imm19", 19], 0, ["cond", 4]],
  asm({imm19, cond}) {
    return `b.${condName(cond)} ${immToString((imm19 * 4) + 4)}`;
  },
  jit(ctx, {imm19, cond}) {
    ctx.branch(ctx.pc + imm19 * 4, condEval(ctx, cond));
  }
});

defineInstruction({
  name: "Test bit",
  pattern: [["b5", 1], 0, 1, 1, 0, 1, 1, ["op", 1], ["b40", 5], ["imm14", 14], ["Rt", 5]],
  asm({b5, op, b40, imm14, Rt}) {
    return `${op ? "tbnz" : "tbz"} ${b5 ? "x" : "w"}${Rt}, ${immToString(b5 * 32 + b40)}, ${immToString(imm14 * 4)}`;
  },
  jit(ctx, {b5, op, b40, imm14, Rt}) {
    const cond = ctx.builder.i32.and(
      ctx.builder.global.get(`x${Rt}`, binaryen.i64),
      b5 ? ctx.builder.i64.const(0, 1 << b40) : ctx.builder.i64.const(1 << b40, 0)
    );

    ctx.branch(
      ctx.pc + imm14 * 4,
      op ? ctx.builder.i32.eqz(cond) : cond,
    );
  }
});
