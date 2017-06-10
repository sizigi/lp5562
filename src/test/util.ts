import * as fs from 'fs';

export function readHex(fileName: string) : Uint8Array {
  const hex = (fs.readFileSync(fileName)
    .toString()
    .match(/\S+/g) || [])

  const bytes = hex.map(d => parseInt(d, 16));
  return new Uint8Array(bytes);
}

export function bufferEqual(buf1 : ArrayBuffer, buf2 : ArrayBuffer) : boolean {
    if (buf1.byteLength != buf2.byteLength) return false;
    var dv1 = new DataView(buf1);
    var dv2 = new DataView(buf2);
    for (var i = 0 ; i < dv1.byteLength; i++) {
        if (dv1.getUint8(i) != dv2.getUint8(i)) return false;
    }
    return true;
}
