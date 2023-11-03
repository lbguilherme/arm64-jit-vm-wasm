import binaryen from "binaryen";

export function shiftName(shift: number) {
  switch (shift) {
    case 0b00: return "lsl";
    case 0b01: return "lsr";
    case 0b10: return "asr";
    case 0b11: return "ror";
  }
  throw new Error("Invalid shift: 0b" + shift.toString(2));
}

export function shiftEval(builder: binaryen.Module, shift: number, amount: number, operand: binaryen.ExpressionRef) {
  if (amount === 0) {
    return operand;
  }

  switch (shift) {
    case 0b00: return builder.i64.shl(operand, builder.i64.const(amount, 0));
    case 0b01: return builder.i64.shr_u(operand, builder.i64.const(amount, 0));
    case 0b10: return builder.i64.shr_s(operand, builder.i64.const(amount, 0));
    case 0b11: return builder.i64.rotl(operand, builder.i64.const(amount, 0));
  }
  throw new Error("Invalid shift: 0b" + shift.toString(2));
}
