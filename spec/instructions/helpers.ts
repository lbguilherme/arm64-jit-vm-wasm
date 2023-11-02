import { Memory } from "../../src/system.js";
import { Cpu } from "../../src/cpu.js";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export function makeCpu() {
  const memory = new Memory(new WebAssembly.Memory({ initial: 1024, maximum: 1024, shared: true }));
  const cpu = new Cpu(memory, 1024);

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

export function runAsm(cpu: Cpu, asm: string) {
  const bin = assemble(asm);

  const mapping = new Uint8Array(cpu.memory.buffer, 1024, bin.byteLength);
  mapping.set(new Uint8Array(bin));

  cpu.execute(1024);
}
