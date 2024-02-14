#!/usr/bin/env node
import {createRequire} from 'node:module';
import yargsParser from 'yargs-parser';
import process from 'node:process';
import path from 'node:path';
import {glob} from 'glob';
import onezip from '../lib/onezip.js';

const require = createRequire(import.meta.url);
const {argv} = process;

const args = yargsParser(argv.slice(2), {
    string: [
        'pack',
        'extract',
    ],
    alias: {
        v: 'version',
        h: 'help',
        p: 'pack',
        x: 'extract',
    },
});

validate(args);

if (args.version)
    version();
else if (args.help)
    help();
else if (args.pack)
    getName(args.pack, (name) => {
        main('pack', name);
    });
else if (args.extract)
    getName(args.extract, (name) => {
        main('extract', name);
    });
else
    help();

function main(operation, file) {
    const cwd = process.cwd();
    let to;
    let packer;
    
    switch(operation) {
    case 'pack':
        to = path.join(cwd, `${file}.zip`);
        packer = onezip.pack(cwd, to, [file]);
        
        break;
    
    case 'extract':
        to = cwd;
        packer = onezip.extract(file, to);
        break;
    }
    
    packer.on('error', (error) => {
        console.error(error.message);
    });
    
    packer.on('progress', (percent) => {
        process.stdout.write(`
${percent}%`);
    });
    
    packer.on('end', () => {
        process.stdout.write('\n');
    });
}

function getName(str, fn) {
    glob(str, (error, files) => {
        if (error)
            return console.error(error.message);
        
        if (!files.length)
            return console.error('file not found');
        
        fn(files[0]);
    });
}

function version() {
    console.log('v' + info().version);
}

function info() {
    return require('../package');
}

function help() {
    const bin = require('../help');
    const usage = `Usage: ${info().name} [path]`;
    
    console.log(usage);
    console.log('Options:');
    
    for (const name of Object.keys(bin)) {
        console.log(`  ${name} ${bin[name]}`);
    }
}

function validate(args) {
    const cmdReg = /^(_|v(ersion)?|h(elp)?|p(ack)?|x|extract)$/;
    
    for (const cmd of Object.keys(args)) {
        if (!cmdReg.test(cmd)) {
            const {name} = info();
            console.error(`'${cmd}' is not a ${name} option. See '${name} --help'.`);
            process.exit(-1);
        }
    }
}
