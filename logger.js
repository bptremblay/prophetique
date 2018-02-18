/**
 * @module js/logger
 * @exports Logger
 */
'use strict';
let instance;
/**
 * getConsole
 */
const out = (function () {
    return console;
})();
/**
 * @constructor
 */
class Logger {
    log() {
        out.log.apply(console, arguments);
    }
    debug() {
        out.log.apply(console, arguments);
    }
    warn() {
        out.warn.apply(console, arguments);
    }
    error() {
        out.error.apply(console, arguments);
    }
}

function getInstance() {
    if (!instance) {
        instance = new Logger();
    }
    return instance;
}
module.exports = new getInstance();