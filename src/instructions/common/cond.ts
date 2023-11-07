import binaryen from "binaryen";

export function condName(cond: number) {
  switch (cond) {
    case 0b0000: return "eq";
    case 0b0001: return "ne";
    case 0b0010: return "hs";
    case 0b0011: return "lo";
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

export function condEval(builder: binaryen.Module, cond: number) {
  switch (cond) {
    case 0b0000: return builder.global.get("pstate.z", binaryen.i32);
    case 0b0001: return builder.i32.eqz(builder.global.get("pstate.z", binaryen.i32));
    case 0b0010: return builder.global.get("pstate.c", binaryen.i32);
    case 0b0011: return builder.i32.eqz(builder.global.get("pstate.c", binaryen.i32));
    case 0b0100: return builder.global.get("pstate.n", binaryen.i32);
    case 0b0101: return builder.i32.eqz(builder.global.get("pstate.n", binaryen.i32));
    case 0b0110: return builder.global.get("pstate.v", binaryen.i32);
    case 0b0111: return builder.i32.eqz(builder.global.get("pstate.v", binaryen.i32));
    case 0b1000: return builder.i32.and(
      builder.global.get("pstate.c", binaryen.i32),
      builder.i32.eqz(builder.global.get("pstate.z", binaryen.i32))
    );
    case 0b1001: return builder.i32.or(
      builder.i32.eqz(builder.global.get("pstate.c", binaryen.i32)),
      builder.global.get("pstate.z", binaryen.i32)
    );
    case 0b1010: return builder.i32.eq(
      builder.global.get("pstate.n", binaryen.i32),
      builder.global.get("pstate.v", binaryen.i32)
    );
    case 0b1011: return builder.i32.ne(
      builder.global.get("pstate.n", binaryen.i32),
      builder.global.get("pstate.v", binaryen.i32)
    );
    case 0b1100: return builder.i32.and(
      builder.i32.eqz(builder.global.get("pstate.z", binaryen.i32)),
      builder.i32.eq(
        builder.global.get("pstate.n", binaryen.i32),
        builder.global.get("pstate.v", binaryen.i32)
      )
    );
    case 0b1101: return builder.i32.or(
      builder.i32.ne(
        builder.global.get("pstate.n", binaryen.i32),
        builder.global.get("pstate.v", binaryen.i32)
      ),
      builder.global.get("pstate.z", binaryen.i32)
    );
    case 0b1110: return builder.i32.const(1);
    case 0b1111: return builder.i32.const(1);
  }
  throw new Error("Invalid condition: 0b" + cond.toString(2));
}
