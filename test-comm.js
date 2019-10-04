/**
 *  @file
 *  Alamods communications abstraction layer - Unit Testing
 *
 *  This module requires the alamods 'comm' module and exercises the
 *  serial communications channels by manipulating the LED of
 *  any smart module (one that contains an embedded processor)
 *  via the SPI bus.
 *
 *  This test module assumes there is at least one module attached
 *  to a Raspberry Pi(r).  At least one module must be at module
 *  address 0.
 */
let     Comm                            = require('./alamods-comm.js');

let     comm                            = new Comm('M');
                            // state machine variable
let     x                               = 0;


comm.i2cWrite(0x20, 0x06, 1, [0x07]);
comm.i2cWrite(0x20, 0x02, 1, [0x50]);


                            // read the model from the module at address 0
console.log(comm.moduleRegRead(0, 0x80));



setInterval(function() {
    switch(x) {
        case 0:
                            // module 0 red & blue LEDs on
            comm.moduleRegWrite(0, 0x90, 0x8005);

            x                               = 1;
            break;
        case 1:
                            // module 0 all LEDs off
            comm.moduleRegWrite(0, 0x90, 0x8000);

            x                               = 0;
            break;
        default:
            x                               = 0;
            break;
    }
}, 333);
