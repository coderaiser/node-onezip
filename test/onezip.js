'use strict';

const {tryCatch} = require('try-catch');

const {test} = require('supertape');
const onezip = require('..');

test('onezip: no args', (t) => {
    const [error] = tryCatch(onezip);
    
    t.equal(error.message, 'operations could be "pack" or "extract" only!', 'should throw when bad operation');
    t.end();
});
