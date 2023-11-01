import { Instruction, instructions } from "./instructions.js";
import { Cpu } from "./cpu.js";

function createDecoder() {
  let code = ``;
  let i = 0;
  for (const instruction of instructions) {
    let mask = 0;
    let maskResult = 0;
    const args: string[] = [];
    let bit = 32;
    for (const entry of instruction.pattern) {
      if (typeof entry === "number") {
        mask = (mask << 1) | 1;
        maskResult = (maskResult << 1) | entry;
        bit--;
      } else {
        const len = entry[1];
        bit -= len;
        mask = mask << len;
        maskResult = maskResult << len;
        args.push(`${JSON.stringify(entry[0])}: (op & ${((1 << len) - 1) << bit}) >> ${bit}`);
      }
    }
    code += `if ((op & ${mask}) === ${maskResult}) {\n`;
    code += `  return action(instructions[${i}], {${args.join(", ")}});\n`;
    code += `}\n`;
    i++;
  }

  code += `return action(undefined, {});\n`;

  const func = new Function("op", "instructions", "action", code) as <T>(
    op: number,
    instructions: Instruction[],
    action: (instruction: Instruction | undefined, args: Record<string, number>) => T,
  ) => T;

  return <T>(
    op: number,
    action: (instruction: Instruction | undefined, args: Record<string, number>) => T,
  ) => func(op, instructions, action);
}

export const decodeInstruction = createDecoder();

export function decodeToAsm(op: number) {
  return decodeInstruction(op, (instruction, args) => instruction?.asm(args));
}

// export const decodeAndInterpret = (op: number, cpu: Cpu) => decoder(op, instructions, instruction => (...args) => instruction.interpret(cpu, ...args));


