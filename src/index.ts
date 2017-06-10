import * as nearley from "nearley";
import * as grammar from './grammar';
import { Map } from 'core-js';

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
  public readonly bitstream: Uint16Array = new Uint16Array(16);
  private pc : number = 0;

  constructor(name : string) {
    this.name = name;
  }

  public addInstruction(ins : number) {
    if(this.pc >= 15 && ins != 0) {
      throw new Error(`${this.name} Capacity Exceeded`)
    }
    this.bitstream[this.pc++] = ins;
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

export class Program {
  public sections: Map<SectionNames, Section> = new Map();
  public clock : number = 32.768;
  private _curSection : Section | null = null;

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

  private switchToSection(section : SectionNames) {
    if(this.sections.has(section)) {
      throw new Error(`${section} already declared`);
    } else {
      this._curSection = new Section(section);
      this.sections.set(section, this._curSection);
    }
  }

  public assemble(data: string) {
    const p = new nearley.Parser(grammar, grammar.ParserStart);
    const d = p.feed(data);
    const instructions: Array<INode> = d.results[0];
    for (let i of instructions) {
      switch (i.node) {
        case "section":
          this.switchToSection(i.name);
          break;
        case "label":
          this.curSection.addLabel(i.name);
          break;
        case "trigger":
          this.curSection.addInstruction(
            (0b111 << 13)
            | (i.wait << 7)
            | (i.send << 1));
          break;
        case "end":
          this.curSection.addInstruction(
            (0b110 << 13)
            | (~~i.int << 12)
            | (~~i.reset << 11));
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
          );
          break;
        case "ramp":
          let steps = i.steps;
          let sign : boolean = steps < 0;

          if(steps == 1 || Math.abs(steps) > 128) {
            throw new Error(`Invalid number of ramp steps ${steps}`);
          }

          if(steps > 0) {
            steps -= 1;
          } else if (steps < 0) {
            steps += 1;
          }

          let calcCycles = (time:number, clock:number, prescaleFlag:number) => {
              let trueCycles = clock * time;
              let cycles = Math.round(trueCycles);
              let length = cycles / clock;
              let difference = Math.abs(time - length);
              return { cycles, difference, prescaleFlag};
          }

          let guesses = [
            calcCycles(i.time, this.clock / 16, 0),
            calcCycles(i.time, this.clock / 512, 1),
          ];

          guesses = guesses.filter(g => g.cycles < 64 && g.cycles > 0);
          if(guesses.length == 0) {
            throw new Error(`Length ${i.time}ms outside of obtainable range (${1/(this.clock/16)}ms - ${63/(this.clock/512)}ms )`);
          }

          let res = guesses.reduce((prev, curr) => prev.difference < curr.difference ? prev : curr);
          this.curSection.addInstruction(
            (res.prescaleFlag << 14)
            | res.cycles << 8
            | ~~sign << 7
            | steps
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

let p = new Program();
p.assemble('ramp 800, -128');
let s1 = p.sections.get('engine1');
console.log(s1!.bitstream);