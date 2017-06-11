import * as assert from 'assert';
import * as fs from 'fs';
import {assemble} from '../lib/index';
import {suite, test} from 'mocha-typescript';
import {readHex, assertEqualBuffer} from './util';

@suite class UtilTest {
  @test bufferSimpleEqual() {
    let a = new Uint8Array(4).fill(0xAA);
    let b = new Uint16Array(2).fill(0xAAAA);
    assertEqualBuffer(a.buffer, b.buffer);
  }

  @test bufferComplexEqual() {
    let a = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    let b = new Uint16Array(2);
    let dv = new DataView(b.buffer);
    dv.setUint16(0, 0xDEAD);
    dv.setUint16(2, 0xBEEF);
    assertEqualBuffer(a.buffer, b.buffer);
  }

  @test bufferNotEqual() {
    let a = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    let b = new Uint16Array([0xCAFE, 0xBABE]);
    assert.throws(() => assertEqualBuffer(a.buffer, b.buffer));
  }

  @test fileCompare() {
    let a = new Uint8Array(readHex('./src/test/programs/test.hex'));
    let b = new Uint16Array(2);
    let dv = new DataView(b.buffer);

    dv.setUint16(0, 0xBAAD);
    dv.setUint16(2, 0xF00D);

    assertEqualBuffer(a.buffer, b.buffer);
  }
}


suite('CompilerTests', () => {
  for(let i of ['blink', 'breathing', 'color_cycle', 'flash_with_afterglow', 'blink_and_color_change']) {
    test(i, () => {
      let a = readHex(`./src/test/programs/${i}.hex`);
      let b = assemble(fs.readFileSync(`./src/test/programs/${i}.src`).toString());
      assertEqualBuffer(a.buffer, b.buffer);
    });
  }
});


  // @test run() {
  //   let a = readHex('./src/test/programs/breathing.hex');
  //   let b = assemble(fs.readFileSync('./src/test/programs/breathing.src').toString());

  //   assertEqualBuffer(a.buffer, b.buffer);
