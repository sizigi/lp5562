import * as fs from 'fs';
import * as assert from 'assert';
import {buf2hex} from '../lib/util';

export function readHex(fileName: string) : Uint8Array {
  const hex = (fs.readFileSync(fileName)
    .toString()
    .match(/\S+/g) || [])

  const bytes = hex.map(d => parseInt(d, 16));
  return new Uint8Array(bytes);
}

export function assertEqualBuffer(buf1: ArrayBuffer, buf2: ArrayBuffer) {
  assert.equal(0,
    bufferDiffCount(buf1, buf2),
    `Buffers not equal (${buf2hex(buf1)}) and (${buf2hex(buf2)})`
  )
}

export function bufferDiffCount(buf1 : ArrayBuffer, buf2 : ArrayBuffer) : number {
    if (buf1.byteLength != buf2.byteLength) throw new Error(`Buffer length mismatch (${buf1.byteLength} vs ${buf2.byteLength})`);
    var dv1 = new DataView(buf1);
    var dv2 = new DataView(buf2);

    let diff = 0;
    for (var i = 0 ; i < dv1.byteLength; i++) {
        if (dv1.getUint8(i) != dv2.getUint8(i)) diff++;
    }
    return diff;
}
