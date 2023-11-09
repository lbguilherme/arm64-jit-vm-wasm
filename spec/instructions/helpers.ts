import { Memory } from "../../src/system.js";
import { Cpu } from "../../src/cpu.js";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { createInstructionDecoder } from "../../src/decoder.js";

export function makeCpu() {
  const memory = new Memory(new WebAssembly.Memory({ initial: 1024, maximum: 1024, shared: true }));
  const cpu = new Cpu(memory, 1024);

  cpu.registers.sp_el0.value = BigInt(cpu.memory.buffer.byteLength);

  return cpu;
}

function assemble(asm: string) {
  const id = randomUUID();
  const objectFile = join(tmpdir(), `${id}.o`);
  const binaryFile = join(tmpdir(), `${id}.bin`);

  try {
    const result1 = spawnSync("aarch64-linux-gnu-as", ["-o", objectFile], { input: asm });

    if (result1.signal || result1.status) {
      throw new Error(result1.output.toString());
    }

    const result2 = spawnSync("aarch64-linux-gnu-objcopy", ["-O", "binary", objectFile, binaryFile]);

    if (result2.signal || result2.status) {
      throw new Error(result2.output.toString());
    }

    return readFileSync(binaryFile);
  } finally {
    try { unlinkSync(objectFile); } catch {}
    try { unlinkSync(binaryFile); } catch {}
  }
}

export function runAsm(cpu: Cpu, asm: string | Uint8Array) {
  const bin = typeof asm === "string" ? assemble(asm + "\nret") : asm;

  const mapping = new Uint8Array(cpu.memory.buffer, 1024, bin.byteLength);
  mapping.set(new Uint8Array(bin));

  return cpu.execute(1024);
}

const decodeInstruction = createInstructionDecoder();

export function decodeToAsm(op: number) {
  return decodeInstruction(op, (instruction, args) => instruction.asm(args));
}

type RegMemValues =
  Partial<Record<keyof Cpu["registers"], bigint>> & {
    mem64?: Partial<{ [address: number]: bigint }>
  };

export function runSingleInstructionTest({ asm, init, expected }: { asm: string, init: RegMemValues, expected: RegMemValues }) {
  const bin = assemble(asm + "\nret");

  expect(decodeToAsm(new Uint32Array(bin.buffer, bin.byteOffset, 1)[0]).replaceAll("\t", " ")).toEqual(asm);

  const cpu = makeCpu();

  for (const [reg, value] of Object.entries(init)) {
    if (reg === "mem64") {
      for (const [address, memValue] of Object.entries(value)) {
        cpu.memory.set64(Number(address), memValue);
      }
    } else {
      cpu.registers[reg as keyof Cpu["registers"]].value = value as bigint;
    }
  }

  runAsm(cpu, bin);

  for (const [reg, value] of Object.entries(expected)) {
    if (reg === "mem64") {
      for (const [address, memValue] of Object.entries(value)) {
        expect(cpu.memory.get64(Number(address))).toEqual(memValue);
      }
    } else {
      expect(cpu.registers[reg as keyof Cpu["registers"]].value).toEqual(value);
    }
  }
}
