/**
 *  @file
 *  Alamods communications abstraction layer - Comm
 *
 *  This module provides an API layer for communication with any/all
 *  alamods modules attached to a host (i.e. Raspberry Pi(r)) system.
 *
 *  It provides an SPI interface for alamods modules with an embedded
 *  processor (smart module).
 */

    /*
     *  REQUIRED NODE MODULES
     */
    let util                                = require("util");
    let EventEmitter                        = require('events').EventEmitter;

    let rpio                                = require('rpio');



    /*
     *  LOCAL VARIABLES
     */
    let spiTxBuf                            = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    let spiRxBuf                            = new Buffer(32);
    let systemType                          = "";



    /*
     *  Module Object Constructor
     *
     *  @param  type    = a letter signifying the approprite type of system
     *                      - 'M' = full modules using alamods communication bus
     *                      - 'Z' = limited module using GPIO for communication and control
     */
    function Comm(type) {
        EventEmitter.call(this);

        let self                            = this;

        if (type === 'Z') {
            systemType                      = type;
        } else {
                            // GPIO setup
            rpio.init({gpiomem: false});
                            // set the alamods module address lines to 0
            rpio.open(16, rpio.OUTPUT, rpio.HIGH);
            rpio.open(18, rpio.OUTPUT, rpio.HIGH);
            rpio.open(29, rpio.OUTPUT, rpio.HIGH);
            rpio.open(31, rpio.OUTPUT, rpio.HIGH);

            systemType                      = 'M';
        }


    }
    util.inherits(Comm, EventEmitter);



    /*
     *  CONSTANTS
     */
    Comm.prototype.LED_OFF                  = 0;
    Comm.prototype.LED_ON                   = 1;

    Comm.prototype.SERIAL_USB               = 0;
    Comm.prototype.SERIAL_RS232             = 1;
    Comm.prototype.SERIAL_TTL               = 2;
    Comm.prototype.SERIAL_RS485             = 3;



    /*
     * API Methods
     */

    /* ----------------------------------------------------------------------------------------------------------------
     *  @module     moduleRegWrite
     *
     *  @param      moduleAddr:     value from 0 - 15 identifying the alamods bus address
     *  @param      registerAddr:   specific module internal register address
     *                                  - value from 0 - 255 or 0 - 2048 depending upon module
     *  @param      regValue:       16 bit value to store into register
     *
     *  @return     void
     *
     *  @description
     *  This method writes a 16 bit (lsb) value into the specified module
     *  internal register
     *
     * ----------------------------------------------------------------------------------------------------------------
     */
    Comm.prototype.moduleRegWrite = function (moduleAddr, registerAddr, regValue) {
                            // SPI setup
        rpio.spiBegin();

        if (systemType == 'M') {
            rpio.spiChipSelect(0);
        } else if (systemType = 'Z') {
            if (moduleAddr == 0) {
                rpio.spiChipSelect(0);
            } else {
                rpio.spiChipSelect(1);
            }
        }
        rpio.spiSetClockDivider(512);
        rpio.spiSetDataMode(0);
                            // set the module address
        if (systemType == 'M') {
            _moduleAddr(moduleAddr);
        }
                            // setup the alamods SPI command structure and send the message
                            //  - byte 0    = 0x02 - is the command to write to an internal register
                            //  - byte 1    = desired module internal register index (addr) to read
                            //  - byte 2/3  = value to write into register
        spiTxBuf[0]                         = 0x02;
        spiTxBuf[1]                         = registerAddr;
        spiTxBuf[2]                         = ((regValue & 0x0000ff00) >> 8);
        spiTxBuf[3]                         = (regValue & 0x000000ff);
        rpio.spiTransfer(spiTxBuf, spiRxBuf, 4);

        rpio.spiEnd();
    }

    /* ----------------------------------------------------------------------------------------------------------------
     *  @module     moduleRegRead
     *
     *  @param      moduleAddr:     value from 0 - 15 identifying the alamods bus address
     *  @param      registerAddr:   specific module internal register address
     *                                  - value from 0 - 255 or 0 - 2048 depending upon module
     *  @param      regValue:       16 bit value to store into register
     *
     *  @return     a 16 bit value read from the specified register
     *
     *  @description
     *  This method reads a 16 bit (lsb) value from the specified module
     *  internal register
     *
     * ----------------------------------------------------------------------------------------------------------------
     */
    Comm.prototype.moduleRegRead            = function (moduleAddr, registerAddr) {
                            // SPI setup
        rpio.spiBegin();

        if (systemType == 'M') {
            rpio.spiChipSelect(0);
        } else if (systemType = 'Z') {
            if (moduleAddr == 0) {
                rpio.spiChipSelect(0);
            } else {
                rpio.spiChipSelect(1);
            }
        }
        rpio.spiSetClockDivider(512);
        rpio.spiSetDataMode(0);
                            // set the module address
        if (systemType == 'M') {
            _moduleAddr(moduleAddr);
        }
                            // setup the read index register within the module
                            //  - byte 0    = 0x01 - is the command to set the internal read index (addr) register
                            //  - byte 1    = desired module internal register index (addr) to read
                            //  - byte 2/3  = any value
        spiTxBuf[0]                         = 0x01;
        spiTxBuf[1]                         = registerAddr;
        spiTxBuf[2]                         = 0x00;
        spiTxBuf[3]                         = 0x00;
        rpio.spiTransfer(spiTxBuf, spiRxBuf, 4);
                            // read the specified module register
                            //  - byte 0    = 0x00 - is the command to read the register pointed to by the index pointer
                            //  - byte 1    = desired module internal register index (addr) to read
                            //  - byte 2/3  = any value
        spiTxBuf[0]                         = 0x00;
        spiTxBuf[1]                         = registerAddr;
        spiTxBuf[2]                         = 0x00;
        spiTxBuf[3]                         = 0x00;
        rpio.spiTransfer(spiTxBuf, spiRxBuf, 4);

        rpio.spiEnd();
                            // return the 16 bit value retrieved from the register
        return(spiRxBuf[3] + ((spiRxBuf[2] << 8) & 0x0000ff00));
    }


    /* ----------------------------------------------------------------------------------------------------------------
     *  @module     i2cRead
     *
     *  @param      moduleAddr:     value from 0 - 15 identifying the alamods bus address
     *  @param      registerAddr:   specific module internal register address
     *                                  - value from 0 - 255 or 0 - 2048 depending upon module
     *  @param      regValue:       16 bit value to store into register
     *
     *  @return     a 16 bit value read from the specified register
     *
     *  @description
     *  This method reads a 16 bit (lsb) value from the specified module
     *  internal register
     *
     * ----------------------------------------------------------------------------------------------------------------
     */
    Comm.prototype.i2cRead                  = function(addr, regAddr, numBytes) {
        let i2cRxBfr                        = new Buffer.alloc(8);
        let i2cTx1Bfr                       = new Buffer.from([0x00]);
        let result                          = 0xffffffff;

        rpio.i2cBegin();
        rpio.i2cSetSlaveAddress(addr);
        rpio.i2cSetBaudRate(100000);
        rpio.i2cSetClockDivider(2500);

        switch (numBytes) {
            case 1:
                i2cTx1Bfr[0]                = regAddr;
                rpio.i2cWrite(i2cTx1Bfr);
                rpio.i2cRead(i2cRxBfr, 1);
                result                      = i2cRxBfr[0] & 0x000000ff;
                break;
            case 2:
                i2cTx1Bfr[0]                = regAddr;
                rpio.i2cWrite(i2cTx1Bfr);
                rpio.i2cRead(i2cRxBfr, 2);
                result                      = (i2cRxBfr[1] + (i2cRxBfr[0] << 8)) & 0x0000ffff;
                break;
            case 3:
                break;
            default:
                break;
        }
        rpio.i2cEnd();

        return(result);
    }

/* ----------------------------------------------------------------------------------------------------------------
 *  @module     i2cWrite
 *
 *  @param      busAddr:        value from 0 - 128 identifying the i2c bus address
 *  @param      registerAddr:   specific internal register address
 *  @param      numBytes:       number of bytes to write onto the I2C bus
 *  @param      bfr:            bytes to store into register
 *
 *  @description
 *  This method writes an 8 or 16 bit (lsb) value into the specified module
 *  internal register
 *
 * ----------------------------------------------------------------------------------------------------------------
 */
Comm.prototype.i2cWrite                 = function(busAddr, regAddr, numBytes, bfr) {
    let i2cTx2Bfr                       = new Buffer.from([0x00, 0x00]);
    let i2cTx3Bfr                       = new Buffer.from([0x00, 0x00, 0x00]);

    rpio.i2cBegin();
    rpio.i2cSetSlaveAddress(busAddr);
    rpio.i2cSetBaudRate(100000);
    rpio.i2cSetClockDivider(2500);

    switch (numBytes) {
        case 1:
            i2cTx2Bfr[0]                = regAddr;
            i2cTx2Bfr[1]                = bfr[0];
            rpio.i2cWrite(i2cTx2Bfr);
            break;
        case 2:
            i2cTx3Bfr[0]                = regAddr;
            i2cTx3Bfr[1]                = bfr[0];
            i2cTx3Bfr[2]                = bfr[1];
            rpio.i2cWrite(i2cTx3Bfr);
            break;
        default:
            break;
    }
    rpio.i2cEnd();
}



/*
 * ---------------------------------
 *
 * ---------------------------------
 */
Comm.prototype.setSystemLED                 = function(state){
    rpio.open(22, rpio.OUTPUT, rpio.LOW);
    rpio.write(22, state);
}



/*
 * ---------------------------------
 *
 * ---------------------------------
 */
Comm.prototype.setSerialPort                = function(portAddr){
    rpio.open(7, rpio.OUTPUT, rpio.LOW);
    rpio.open(11, rpio.OUTPUT, rpio.LOW);

    switch(portAddr) {
        case 0:
            rpio.write(7, rpio.LOW);
            rpio.write(11, rpio.LOW);
            break;
        case 1:
            rpio.write(7, rpio.HIGH);
            rpio.write(11, rpio.LOW);
            break;
        case 2:
            rpio.write(7, rpio.LOW);
            rpio.write(11, rpio.HIGH);
            break;
        case 3:
            rpio.write(7, rpio.HIGH);
            rpio.write(11, rpio.HIGH);
            break;
        default:
            break;
    }
}





    /*
     * Internal Utility Methods
     */
                            // This function sets the module bus address lines to
                            // to the appropriate values depending upon the
                            // desired module address
    function _moduleAddr(addr) {
        if (addr < 16) {
            switch (addr) {
                case 0:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 1:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 2:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 3:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 4:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 5:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 6:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 7:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.HIGH);
                    break;
                case 8:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 9:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 10:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 11:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 12:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 13:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 14:
                    rpio.open(16, rpio.OUTPUT, rpio.HIGH);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                case 15:
                    rpio.open(16, rpio.OUTPUT, rpio.LOW);
                    rpio.open(18, rpio.OUTPUT, rpio.LOW);
                    rpio.open(29, rpio.OUTPUT, rpio.LOW);
                    rpio.open(31, rpio.OUTPUT, rpio.LOW);
                    break;
                default:
                    break;
            }
        }

    }


    module.exports                          = Comm;
