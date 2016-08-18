#!/usr/bin/env node

'use strict';

var onezip      = require('..'),
    path        = require('path'),
    glob        = require('glob'),
    argv        = process.argv,
    
    args        = require('yargs-parser')(argv.slice(2), {
        boolean: [
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
    getName(args.pack, function(name) {
        main('pack', name);
    });
else if (args.extract)
   getName(args.extract, function(name) {
        main('extract', name);
    });
else
    help();

function main(operation, file) {
    const cwd = process.cwd();
    let to, packer, wasError;
    
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
    
    packer.on('error', function(error) {
        console.log('---->');
        wasError = true;
        console.error(error.message);
    });
    
    packer.on('progress', function(percent) {
        process.stdout.write('\r' + percent + '%');
    });
    
    packer.on('end', function() {
        !wasError && process.stdout.write('\n');
    });
}

function getName(str, fn) {
    glob(str, function(error, files) {
        if (error)
            console.error(error.message);
        else if (!files.length)
            console.error('file not found');
        else
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
    var bin         = require('../help'),
        usage       = 'Usage: ' + info().name + ' [path]';
        
    console.log(usage);
    console.log('Options:');
    
    Object.keys(bin).forEach(function(name) {
        var line = '  ' + name + ' ' + bin[name];
        console.log(line);
    });
}

function validate(args) {
    const cmdReg = /^(_|v(ersion)?|h(elp)?|p(ack)?|x|extract)$/;
    
    Object.keys(args).forEach((cmd) => {
        if (!cmdReg.test(cmd)) {
            const name = info().name;
            
            console.error(
                '\'%s\' is not a ' +  name + ' option. ' +
                'See \'' + name + ' --help\'.', cmd
            );
            
            process.exit(-1);
        }
    });
}

