import {tryCatch} from 'try-catch';
import {test} from 'supertape';
import {onezip} from '../lib/onezip.js';

test('onezip: no args', (t) => {
    const [error] = tryCatch(onezip);
    
    t.equal(error.message, 'operations could be "pack" or "extract" only!', 'should throw when bad operation');
    t.end();
});
