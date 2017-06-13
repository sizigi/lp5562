[![npm version](https://badge.fury.io/js/lp5562.svg)](https://badge.fury.io/js/lp5562)

# LP5562

This package is a quick and dirty assembler for the [Texas Instruments LP5562][lp5562]. Package is primarily written so that an open-source toolchain can be provided for the LED controller used in the [keyswitch.one][kso] project.

## Usage

First install via npm:

    npm install --save lp5562

Then include it in your project

```typescript
// if using typescript or ES6 modules
import {assemble} from 'lp5562'

// or if using ES5
var assemble = require('lp5562').assemble;
```

Typescript definitions are included in the package. The function's signature is:

### `assemble(program : string) : Uint16Array`

where `program` is the string representation of the assembly program, and the resulting `Uint16Array` is an array of 48 16-bit WORDs representing the memory map of LP5562's program space.

```typescript
assemble(`
  .engine1
  set_pwm 255

  flash:
    ramp 200, -128
    ramp 200, 128
    branch 5, flash

  ramp 200, -128
  ramp 200, -127
  end, i
`);
```

Produces:

    Uint16Array[ 65344, 65283, 32515, 33186, 65283, 65027, 208, 0, 0, 0, ... 0 ]

All data is provided in big-endian format (as the LP5562 is an 8-bit device). Feed the `Uint16Array#buffer` to a `Uint8Array` or use a `DataView` if you need a different data representation.

## Grammar

For the assembly language spec, see the [grammar](src/lib/grammar.ne). As a rule of thumb, all instructions that work on the official assembler provided with the evaluation module should work here as well. See §3.4.1 and §3.4.2 in the [EVM docs](docs/snvu203a.pdf) for syntax and parameters.

## Contributing

This project is MIT Licensed. Pull requests welcome. Changes documented in [CHANGELOG.md](CHANGELOG.md).

[lp5562]: http://www.ti.com/product/LP5562
[kso]: http://keyswitch.one
