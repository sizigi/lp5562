"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var fs = require("fs");
var index_1 = require("../lib/index");
var mocha_typescript_1 = require("mocha-typescript");
var util_1 = require("./util");
var UtilTest = (function () {
    function UtilTest() {
    }
    UtilTest.prototype.bufferSimpleEqual = function () {
        var a = new Uint8Array(4).fill(0xAA);
        var b = new Uint16Array(2).fill(0xAAAA);
        assert.equal(true, util_1.bufferEqual(a.buffer, b.buffer));
    };
    UtilTest.prototype.bufferComplexEqual = function () {
        var a = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
        var b = new Uint16Array(2);
        var dv = new DataView(b.buffer);
        dv.setUint16(0, 0xDEAD);
        dv.setUint16(2, 0xBEEF);
        assert.equal(true, util_1.bufferEqual(a.buffer, b.buffer), "contents equal");
    };
    UtilTest.prototype.bufferNotEqual = function () {
        var a = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
        var b = new Uint16Array([0xCAFE, 0xBABE]);
        assert.equal(false, util_1.bufferEqual(a.buffer, b.buffer), "contents not equal");
    };
    UtilTest.prototype.fileCompare = function () {
        var a = new Uint8Array(util_1.readHex('./src/test/programs/test.hex'));
        var b = new Uint16Array(2);
        var dv = new DataView(b.buffer);
        dv.setUint16(0, 0xBAAD);
        dv.setUint16(2, 0xF00D);
        assert.equal(true, util_1.bufferEqual(a.buffer, b.buffer), 'file does not match code');
    };
    return UtilTest;
}());
__decorate([
    mocha_typescript_1.test
], UtilTest.prototype, "bufferSimpleEqual", null);
__decorate([
    mocha_typescript_1.test
], UtilTest.prototype, "bufferComplexEqual", null);
__decorate([
    mocha_typescript_1.test
], UtilTest.prototype, "bufferNotEqual", null);
__decorate([
    mocha_typescript_1.test
], UtilTest.prototype, "fileCompare", null);
UtilTest = __decorate([
    mocha_typescript_1.suite
], UtilTest);
var CompilerTest = (function () {
    function CompilerTest() {
    }
    CompilerTest.prototype.run = function () {
        var a = util_1.readHex('./src/test/programs/breathing.hex');
        var b = index_1.assemble(fs.readFileSync('./src/test/programs/breathing.src').toString());
    };
    return CompilerTest;
}());
__decorate([
    mocha_typescript_1.test
], CompilerTest.prototype, "run", null);
CompilerTest = __decorate([
    mocha_typescript_1.suite
], CompilerTest);
//# sourceMappingURL=test.js.map