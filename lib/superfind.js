'use strict';

const findit = require('findit2');
const inhale = require('./inhale');

const getFirst = ([a]) => a;

module.exports = async (filename) => {
    const finder = findit(filename);
    
    const {
        file,
        directory,
        link,
    } = await inhale(finder, ['file', 'directory', 'link']);
    
    const names = [
        ...file.map(getFirst),
        ...directory.map(getFirst),
        ...link.map(getFirst),
    ];
    
    return {
        file,
        directory,
        link,
        names,
    };
};
