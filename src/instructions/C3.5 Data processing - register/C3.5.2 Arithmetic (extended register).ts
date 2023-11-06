import { defineInstruction, immToString } from "../base.js";

defineInstruction({
  name: "ADD (Add)",
  pattern: [["sf", 1], 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, ["Rm", 5], ["option", 3], ["imm3", 3], ["Rn", 5], ["Rd", 5]],
  asm({sf, Rm, option, imm3, Rn, Rd}) {
    const extend =
      option === 0b000 ? "uxtb" :
      option === 0b001 ? "uxth" :
      option === 0b010 ? (!sf ? "lsl" : "uxtw") :
      option === 0b011 ? (sf ? "lsl" : "uxtx") :
      option === 0b100 ? "sxtb" :
      option === 0b101 ? "sxth" :
      option === 0b110 ? "sxtw" :
      option === 0b111 ? "sxtx" : "";

    return "add\t" + [
      Rd === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rd}`,
      Rn === 31 ? (sf ? "sp" : "wsp") : `${sf ? "x" : "w"}${Rn}`,
      `${!sf || (option & 0b11) === 0b11 ? "w" : "x"}${Rm}`,
      ...(imm3 !== 0 && extend !== "lsl" ? [`${extend} ${immToString(imm3)}`] : [])
    ].join(", ");
  },
  jit(ctx, {sf, Rm, option, imm3, Rn, Rd}) {
    throw new Error("ADD not implemented");
  }
});
