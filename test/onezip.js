import {tryCatch} from 'try-catch';
import {test} from 'supertape';
import {
    onezip,
    pack,
    extract,
} from '../lib/onezip.js';

test('onezip: no args', (t) => {
    const [error] = tryCatch(onezip);
    
    t.equal(error.message, 'operations could be "pack" or "extract" only!', 'should throw when bad operation');
    t.end();
});

test('onezip: pack: exists', (t) => {
    t.equal(onezip.pack, pack);
    t.end();
});

test('onezip: extract: exists', (t) => {
    t.equal(onezip.extract, extract);
    t.end();
});
