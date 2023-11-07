import binaryen from "binaryen";

import { ArmSystem } from "./system.js";
import { readFileSync, writeFileSync } from "fs";
try {

  const system = new ArmSystem({
    memory: {
      maxSizeMb: 1024
    },
    linux: {
      image: readFileSync("linux.bin").buffer
    }
  });
} catch (e) {
  console.error(e)
}
// var builder = new binaryen.Module();

// builder.addFunction("add", binaryen.createType([ binaryen.i32, binaryen.i32 ]), binaryen.i32, [ binaryen.i32 ],
//   builder.block(null, [
//     builder.local.set(2,
//       builder.i32.add(
//         builder.local.get(0, binaryen.i32),
//         builder.local.get(1, binaryen.i32)
//       )
//     ),
//     builder.return(
//       builder.local.get(2, binaryen.i32)
//     )
//   ])
// );

// builder.addFunctionExport("add", "add");

// console.log(builder.emitText());

// const moduleBytes = builder.toBytes();
// const mod = WebAssembly.instantiate(moduleBytes);
// writeFileSync("test.wasm", moduleBytes);
