'use strict';

const {promisify} = require('util');

const add = (emitter, event, result) => {
    emitter.on(event, (...args) => {
        result[event].push(args);
    });
};

module.exports = promisify((emitter, events, fn) => {
    const result = {};
    
    emitter.once('error', fn);
    
    for (const event of events) {
        result[event] = [];
        add(emitter, event, result);
    }
    
    emitter.once('end', () => {
        fn(null, result);
    });
});
