"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nearley = require("nearley");
var grammar = require("./grammar");
var core_js_1 = require("core-js");
function throwBadNode(n) {
    throw new Error("Unknown node type " + n.node);
}
var Section = (function () {
    function Section(name) {
        this.labels = new core_js_1.Map();
        this.bitstream = new Uint16Array(16);
        this.pc = 0;
        this.name = name;
    }
    Section.prototype.addInstruction = function (ins) {
        if (this.pc >= 15 && ins != 0) {
            throw new Error(this.name + " Capacity Exceeded");
        }
        this.bitstream[this.pc++] = ins;
    };
    Section.prototype.addLabel = function (name) {
        if (this.labels.has(name)) {
            throw new Error("Duplicate label \"" + name + "\" declared");
        }
        this.labels.set(name, this.pc);
    };
    Section.prototype.getLabel = function (name) {
        var pos = this.labels.get(name);
        if (pos == undefined)
            throw new Error("Label \"" + name + "\" does not exist");
        return pos;
    };
    return Section;
}());
exports.Section = Section;
var LP5562Program = (function () {
    function LP5562Program() {
        this.sections = new core_js_1.Map();
        this.clock = 32.768;
        this._curSection = null;
    }
    Object.defineProperty(LP5562Program.prototype, "curSection", {
        get: function () {
            if (this._curSection === null) {
                this._curSection = new Section('engine1');
                this.sections.set('engine1', this._curSection);
            }
            return this._curSection;
        },
        set: function (section) {
            this._curSection = section;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LP5562Program.prototype, "bitstream", {
        get: function () {
            var bs = new Uint16Array(3 * 16);
            var e1 = this.sections.get('engine1');
            var e2 = this.sections.get('engine2');
            var e3 = this.sections.get('engine3');
            if (e1)
                bs.set(e1.bitstream, 0);
            if (e2)
                bs.set(e2.bitstream, 16);
            if (e3)
                bs.set(e3.bitstream, 16 * 2);
            return bs;
        },
        enumerable: true,
        configurable: true
    });
    LP5562Program.prototype.switchToSection = function (section) {
        if (this.sections.has(section)) {
            throw new Error(section + " already declared");
        }
        else {
            this._curSection = new Section(section);
            this.sections.set(section, this._curSection);
        }
    };
    LP5562Program.prototype.assemble = function (data) {
        var p = new nearley.Parser(grammar, grammar.ParserStart);
        var d = p.feed(data);
        var instructions = d.results[0];
        for (var _i = 0, instructions_1 = instructions; _i < instructions_1.length; _i++) {
            var i = instructions_1[_i];
            switch (i.node) {
                case "section":
                    this.switchToSection(i.name);
                    break;
                case "label":
                    this.curSection.addLabel(i.name);
                    break;
                case "trigger":
                    this.curSection.addInstruction((7 << 13)
                        | (i.wait << 7)
                        | (i.send << 1));
                    break;
                case "end":
                    this.curSection.addInstruction((6 << 13)
                        | (~~i.int << 12)
                        | (~~i.reset << 11));
                    break;
                case "start":
                    this.curSection.addInstruction(0);
                    break;
                case "branch":
                    if (i.count < 0 || i.count >= 64) {
                        throw new Error("Unsupported loop count: " + i.count);
                    }
                    this.curSection.addInstruction((5 << 13)
                        | i.count << 7
                        | this.curSection.getLabel(i.target));
                    break;
                case "ramp":
                    var steps = i.steps;
                    var sign = steps < 0;
                    if (steps == 1 || Math.abs(steps) > 128) {
                        throw new Error("Invalid number of ramp steps " + steps);
                    }
                    if (steps > 0) {
                        steps -= 1;
                    }
                    else if (steps < 0) {
                        steps += 1;
                    }
                    var calcCycles = function (time, clock, prescaleFlag) {
                        var trueCycles = clock * time;
                        var cycles = Math.round(trueCycles);
                        var length = cycles / clock;
                        var difference = Math.abs(time - length);
                        return { cycles: cycles, difference: difference, prescaleFlag: prescaleFlag };
                    };
                    var guesses = [
                        calcCycles(i.time, this.clock / 16, 0),
                        calcCycles(i.time, this.clock / 512, 1),
                    ];
                    guesses = guesses.filter(function (g) { return g.cycles < 64 && g.cycles > 0; });
                    if (guesses.length == 0) {
                        throw new Error("Length " + i.time + "ms outside of obtainable range (" + 1 / (this.clock / 16) + "ms - " + 63 / (this.clock / 512) + "ms )");
                    }
                    var res = guesses.reduce(function (prev, curr) { return prev.difference < curr.difference ? prev : curr; });
                    this.curSection.addInstruction((res.prescaleFlag << 14)
                        | res.cycles << 8
                        | ~~sign << 7
                        | steps);
                    break;
                case "pwm":
                    if (i.value < 0 || i.value > 255) {
                        throw new Error("PWM value " + i.value + " out of range");
                    }
                    this.curSection.addInstruction((2 << 13)
                        | i.value);
                    break;
                default:
                    throwBadNode(i);
            }
        }
    };
    return LP5562Program;
}());
exports.LP5562Program = LP5562Program;
function assemble(assembly) {
    var p = new LP5562Program();
    p.assemble(assembly);
    return p.bitstream;
}
exports.assemble = assemble;
//# sourceMappingURL=index.js.map