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
    const checks: string[] = [];
    for (const entry of instruction.pattern) {
      if (typeof entry === "number") {
        mask = (mask << 1) | 1;
        maskResult = (maskResult << 1) | entry;
        bit--;
      } else {
        const len = entry[1];
        const options = entry[2];
        bit -= len;
        mask = mask << len;
        maskResult = maskResult << len;
        const paramValue = `(op >> ${bit}) & ${((1 << len) - 1)}`;
        args.push(`${JSON.stringify(entry[0])}: ${paramValue}`);
        if (options?.not !== undefined) {
          for (const not of Array.isArray(options.not) ? options.not : [options.not]) {
            checks.push(`(${paramValue}) !== ${not}`);
          }
        }
        if (options?.only !== undefined) {
          const only = Array.isArray(options.only) ? options.only : [options.only];
          checks.push(`(${only.map(v => `(${paramValue}) === ${v}`).join(" || ")})`);
        }
      }
    }
    checks.unshift(`(op & ${mask}) === ${maskResult}`);
    code += `// ${instruction.name}\n`;
    code += `if (${checks.join(" && ")}) {\n`;
    code += `  return action(instructions[${i}], {${args.join(", ")}});\n`;
    code += `}\n`;
    i++;
  }

  code += `const opBin = op.toString(16).padStart(8, "0");\n`;
  code += `throw new Error("Invalid instruction: " + opBin.match(/../g).reverse().join(""));\n`;

  const func = new Function("op", "instructions", "action", code) as <T>(
    op: number,
    instructions: Instruction[],
    action: (instruction: Instruction, args: Record<string, number>) => T,
  ) => T;

  return <T>(
    op: number,
    action: (instruction: Instruction, args: Record<string, number>) => T,
  ) => func(op, instructions, action);
}

export const decodeInstruction = createDecoder();

export function decodeToAsm(op: number) {
  return decodeInstruction(op, (instruction, args) => instruction?.asm(args));
}

// export const decodeAndInterpret = (op: number, cpu: Cpu) => decoder(op, instructions, instruction => (...args) => instruction.interpret(cpu, ...args));


