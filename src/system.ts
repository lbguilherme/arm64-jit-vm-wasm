// import { decodeAndInterpret, decodeToAsm } from "./decoder.js";
import { Cpu } from "./cpu.js";

interface Config {
  memory: {
    maxSizeMb: number
  },
  linux: {
    image: ArrayBuffer
  }
}

export class Memory {
  readonly wasmMemory: WebAssembly.Memory;
  #memview: DataView;
  #mem8: Uint8Array;
  #mem32: Uint32Array;
  #mem64: BigUint64Array;

  constructor(memory: WebAssembly.Memory) {
    this.wasmMemory = memory;
    this.#mem8 = new Uint8Array(this.wasmMemory.buffer);
    this.#mem32 = new Uint32Array(this.wasmMemory.buffer);
    this.#mem64 = new BigUint64Array(this.wasmMemory.buffer);
    this.#memview = new DataView(this.wasmMemory.buffer);
  }

  get buffer() {
    return this.wasmMemory.buffer;
  }

  get8(addr: number) {
    return this.#mem8[addr];
  }

  set8(addr: number, value: number) {
    return this.#mem8[addr] = value;
  }

  get32(addr: number) {
    return this.#memview.getUint32(Number(addr), true);
  }

  get32Aligned(addr: number) {
    return this.#mem32[addr / 4];
  }

  set32Aligned(addr: number, value: number) {
    return this.#mem32[addr / 4] = value;
  }

  get64(addr: number) {
    return this.#memview.getBigUint64(Number(addr), true);
  }

  get64Aligned(addr: number) {
    return this.#mem64[addr / 8];
  }

  set64Aligned(addr: number, value: bigint) {
    return this.#mem64[addr / 8] = value;
  }
}

export class ArmSystem {
  #config: Config;
  #memory: Memory;
  #cpu: Cpu;

  constructor(config: Config) {
    this.#config = config;
    this.#memory = new Memory(new WebAssembly.Memory({ initial: 1024, maximum: config.memory.maxSizeMb * 1024 / 64 }));
    this.#cpu = new Cpu(this.#memory, 1024);

    // copy linux image to memory
    const linuxImage = new Uint8Array(this.#memory.buffer, 2 * 1024 * 1024, config.linux.image.byteLength);
    linuxImage.set(new Uint8Array(config.linux.image));

    this.#cpu.execute(2 * 1024 * 1024);

    console.log(this.#cpu.registers.x19);
    console.log(this.#cpu.registers.x30);

  }
}
