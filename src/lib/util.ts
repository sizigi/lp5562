export function buf2hex(buffer:ArrayBuffer) {
  return Array.prototype.map.call(new Uint8Array(buffer),
    (x:number) => ('00' + x.toString(16)).slice(-2)).join(' ');
}
