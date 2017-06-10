import * as assert from 'assert';
import * as fs from 'fs';
import {assemble} from '../lib/index';
import {suite, test} from 'mocha-typescript';
import {readHex, bufferEqual} from './util';

@suite class UtilTest {
  @test bufferSimpleEqual() {
    let a = new Uint8Array(4).fill(0xAA);
    let b = new Uint16Array(2).fill(0xAAAA);
    assert.equal(true, bufferEqual(a.buffer, b.buffer));
  }

  @test bufferComplexEqual() {
    let a = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    let b = new Uint16Array(2);
    let dv = new DataView(b.buffer);
    dv.setUint16(0, 0xDEAD);
    dv.setUint16(2, 0xBEEF);
    assert.equal(true, bufferEqual(a.buffer, b.buffer), "contents equal");
  }

  @test bufferNotEqual() {
    let a = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    let b = new Uint16Array([0xCAFE, 0xBABE]);
    assert.equal(false, bufferEqual(a.buffer, b.buffer), "contents not equal");
  }

  @test fileCompare() {
    let a = new Uint8Array(readHex('./src/test/programs/test.hex'));
    let b = new Uint16Array(2);
    let dv = new DataView(b.buffer);

    dv.setUint16(0, 0xBAAD);
    dv.setUint16(2, 0xF00D);

    assert.equal(true, bufferEqual(a.buffer, b.buffer), 'file does not match code');
  }
}
