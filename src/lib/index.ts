import * as nearley from "nearley";
import { Map } from 'core-js';

import * as grammar from './grammar';
import {buf2hex} from './util';

type SectionNames = "engine1" | "engine2" | "engine3";
interface ILabelNode {
  readonly node: "label";
  readonly name: string;
}
interface ISectionNode {
  readonly node: "section";
  readonly name: SectionNames;
}
interface IRampNode {
  readonly node: "ramp";
  readonly time: number;
  readonly steps: number;
}
interface IBranchNode {
  readonly node: "branch";
  readonly count: number;
  readonly target: string;
}
interface IStartNode {
  readonly node: "start";
}
interface IPwmNode {
  readonly node: "pwm";
  readonly value: number;

}
interface IEndNode {
  readonly node: "end";
  readonly reset: boolean;
  readonly int: boolean;
}
interface ITriggerNode {
  readonly node: "trigger";
  readonly send: number;
  readonly wait: number;
}

type INode =
  ILabelNode
  | ISectionNode
  | IPwmNode
  | IRampNode
  | IBranchNode
  | IStartNode
  | IEndNode
  | ITriggerNode;

function throwBadNode(n : never): never;
function throwBadNode(n : INode) {
  throw new Error(`Unknown node type ${n.node}`);
}

export class Section {
  public readonly name : string;
  private readonly labels: Map<string, number> = new Map();

  public readonly bitstream : Uint16Array = new Uint16Array(16);
  public readonly dataview: DataView = new DataView(this.bitstream.buffer);
  public readonly number : number;
  private pc : number = 0;

  constructor(name : string) {
    this.name = name;
    this.number = parseInt(name[name.length-1]);
  }

  public addInstruction(ins : number) {
    if(this.pc > 15 && ins != 0) {
      throw new Error(`${this.name} Capacity Exceeded`)
    }
    this.dataview.setInt16(this.pc++ * 2, ins);
  }

  public addLabel(name:string) {
    if(this.labels.has(name)) {
      throw new Error(`Duplicate label "${name}" declared`);
    } 
    this.labels.set(name, this.pc);
  }

  public getLabel(name: string):number {
    let pos = this.labels.get(name);
    if(pos == undefined) throw new Error(`Label "${name}" does not exist`);
    return pos;
  }
}

export class LP5562Program {
  public sections: Map<SectionNames, Section> = new Map();
  public clock : number = 32.768;
  private _curSection : Section | null = null;
  private _globalLabelList : Set<string> = new Set();

  private get curSection() : Section {
    if(this._curSection === null) {
      this._curSection = new Section('engine1');
      this.sections.set('engine1', this._curSection);
    }
    return this._curSection;
  }
  private set curSection(section : Section) {
    this._curSection = section;
  }

  public get bitstream() : Uint16Array {
    const bs = new Uint16Array(3*16);
    const e1 = this.sections.get('engine1');
    const e2 = this.sections.get('engine2');
    const e3 = this.sections.get('engine3');

    if(e1) bs.set(e1.bitstream, 0);
    if(e2) bs.set(e2.bitstream, 16);
    if(e3) bs.set(e3.bitstream, 16*2);

    return bs;
  }

  private switchToSection(section : SectionNames) {
    if(this.sections.has(section)) {
      throw new Error(`${section} already declared`);
    } else {
      this._curSection = new Section(section);
      this.sections.set(section, this._curSection);
    }
  }

  public assemble(data: string) : void {
    const p = new nearley.Parser(grammar, grammar.ParserStart);
    const d = p.feed(data);
    const instructions: Array<INode> = d.results[0];
    for (let i of instructions) {
      switch (i.node) {
        case "section":
          this.switchToSection(i.name);
          break;
        case "label":
          const name = i.name;
          if(this._globalLabelList.has(name)) {
            throw new Error(`Duplicate label "${name}" declared`);
          } else {
            this._globalLabelList.add(name);
            this.curSection.addLabel(name);
          }
          break;
        case "trigger":
          this.curSection.addInstruction(
            (0b111 << 13)
            | (i.wait << 7)
            | (i.send << 1)
            );
          break;
        case "end":
          this.curSection.addInstruction(
            (0b110 << 13)
            | (~~i.int << 12)
            | (~~i.reset << 11)
            );
          break;
        case "start":
          this.curSection.addInstruction(0);
          break;
        case "branch":
          if(i.count < 0 || i.count >= 64) {
            throw new Error(`Unsupported loop count: ${i.count}`);
          }

          this.curSection.addInstruction(
            (0b101 << 13)
            | i.count << 7
            | this.curSection.getLabel(i.target)

            // the following is not strictly necessary but is required to match the TI compiler's
            // output since they use absolute position in the DO NOT CARE bits.
            | ((this.curSection.number - 1) & 0b111) << 4
            );
          break;
        case "ramp":
          let steps = Math.abs(i.steps);
          let decrease : boolean = i.steps < 0;
          let increment : number;

          if(steps == 1 || steps > 128) {
            throw new Error(`Invalid number of ramp steps ${steps}`);
          } else if (steps == 0) {
            increment = 0;
          } else {
            increment  = steps - 1;
          }

          let calcCycles = (time:number, clock:number, prescaleFlag:number) => {
              let trueCycles = clock * time;
              let cycles = Math.round(trueCycles);
              let length = cycles / clock;
              let difference = Math.abs(time - length);
              return { cycles, difference, prescaleFlag};
          }

          let guesses = [
            calcCycles(i.time/(increment+1), this.clock / 16, 0),
            calcCycles(i.time/(increment+1), this.clock / 512, 1),
          ];

          guesses = guesses.filter(g => g.cycles < 64 && g.cycles > 0);
          if(guesses.length == 0) {
            throw new Error(`Length ${i.time}ms outside of obtainable range (${1/(this.clock/16)}ms - ${63/(this.clock/512)}ms )`);
          }
          let res = guesses.reduce((prev, curr) => prev.difference < curr.difference ? prev : curr);

          this.curSection.addInstruction(
            (res.prescaleFlag << 14)
            | res.cycles << 8
            | ~~decrease << 7
            | increment
            );
          break;
        case "pwm":
          if(i.value < 0 || i.value > 255) {
            throw new Error(`PWM value ${i.value} out of range`);
          }
          this.curSection.addInstruction(
            (0b010 << 13)
            | i.value
          )
          break;
        default:
          throwBadNode(i);
      }
    }
  }
}


/**
 * Takes in a assembly and returns the full 16 length instructino stream
 * for all 3 engines as a Uint16Array
 */
export function assemble(assembly:string) : Uint16Array  {
  const p = new LP5562Program();
  p.assemble(assembly);
  return p.bitstream;
}
