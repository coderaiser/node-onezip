'use strict';

const {run} = require('madrun');

module.exports = {
    'lint': () => 'putout .',
    'fresh:lint': () => run('lint', '--fresh'),
    'lint:fresh': () => run('lint', '--fresh'),
    'fix:lint': () => run('lint', '--fix'),
    'test': () => `tape 'test/**/*.js'`,
    'coverage': () => 'c8 npm test',
    'report': () => 'c8 report --reporter=text-lcov | coveralls',
    'watcher': () => 'nodemon -w test -w lib --exec',
    'watch:test': () => run('watcher', 'npm test'),
    'watch:coverage': () => run('watcher', 'npm run coverage'),
};
