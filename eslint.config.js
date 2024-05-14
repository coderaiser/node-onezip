'use strict';

const {matchToFlat} = require('@putout/eslint-flat');
const {safeAlign} = require('eslint-plugin-putout/config');
const match = {
    'bin/**': {
        'no-process-exit': 'off',
    },
};

module.exports = [
    ...safeAlign, {
        rules: {
            'node/no-unsupported-features/node-builtins': 'off',
        },
    },
    ...matchToFlat(match),
];
module.exports.match = match;
