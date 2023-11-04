
function ones(len: number) {
  return (1n << BigInt(len)) - 1n;
}

function ror(value: bigint, len: number, shift: number) {
  return ((value >> BigInt(shift)) | (value << BigInt(len - shift))) & ones(len);
}

function replicate(value: bigint, len: number, count: number) {
  let result = 0n;
  for (let i = 0; i < count; i++) {
    result |= value << BigInt(i * len);
  }
  return result;
}

export function decodeBitMasks(immn: number, imms: number, immr: number, immediate: boolean, datasize: number) {
  const len = 32 - Math.clz32((immn << 6) | (~imms & 0b111111));
  const levels = Number(ones(len));

  const s = imms & levels;
  const r = immr & levels;
  const diff = (s - r) & 0b111111;
  const esize = 1 << len;
  const d = diff & levels;
  const welem = ones(s + 1);
  const telem = ones(d + 1);
  const wmask = replicate(ror(welem, esize, r), esize, datasize / esize);
  const tmask = replicate(telem, esize, datasize / esize);

  return [wmask, tmask] as const;
}
