#!/usr/bin/env node

'use strict';

const onezip = require('..');
const path = require('path');
const glob = require('glob');
const argv = process.argv;

const args = require('yargs-parser')(argv.slice(2), {
    string: [
        'pack',
        'extract',
    ],
    alias: {
        v: 'version',
        h: 'help',
        p: 'pack',
        x: 'extract'
    }
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
    let to, packer;
    
    switch(operation) {
    case 'pack':
        to      = path.join(cwd, file + '.zip');
        packer  = onezip.pack(cwd, to, [
            file
        ]);
        
        break;
    
    case 'extract':
        to      = cwd;
        packer  = onezip.extract(file, to);
        break;
    }
    
    packer.on('error', (error) => {
        console.error(error.message);
    });
    
    packer.on('progress', function(percent) {
        process.stdout.write('\r' + percent + '%');
    });
    
    packer.on('end', function() {
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
    
    Object.keys(bin).forEach((name) => {
        console.log(`  ${name} ${bin[name]}`);
    });
}

function validate(args) {
    const cmdReg = /^(_|v(ersion)?|h(elp)?|p(ack)?|x|extract)$/;
    
    Object.keys(args).forEach((cmd) => {
        if (!cmdReg.test(cmd)) {
            const name = info().name;
            console.error(`'${cmd}' is not a ${name} option. See '${name} --help'.`);
            process.exit(-1);
        }
    });
}

