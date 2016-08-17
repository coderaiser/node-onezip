#!/usr/bin/env node

'use strict';

var jaguar      = require('..'),
    path        = require('path'),
    glob        = require('glob'),
    argv        = process.argv,
    
    args        = require('minimist')(argv.slice(2), {
        string: [
            'pack',
            'extract',
        ],
        alias: {
            v: 'version',
            h: 'help',
            p: 'pack',
            x: 'extract'
        },
        unknown: function(cmd) {
            var name = info().name;
            
            console.error(
                '\'%s\' is not a ' +  name + ' option. ' +
                'See \'' + name + ' --help\'.', cmd
            );
            
            process.exit(-1);
        }
    });
    
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
    var packer, wasError,
        from, to,
        cwd     = process.cwd();
        
    switch(operation) {
    case 'pack':
        from    = cwd;
        to      = path.join(cwd, file + '.zip');
        packer  = jaguar.pack(cwd, to, [
            file
        ]);
        
        break;
    
    case 'extract':
        to      = cwd;
        packer  = jaguar.extract(file, to);
        break;
    }
    
    packer.on('error', function(error) {
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
    var bin         = require('../json/bin'),
        usage       = 'Usage: ' + info().name + ' [path]';
        
    console.log(usage);
    console.log('Options:');
    
    Object.keys(bin).forEach(function(name) {
        var line = '  ' + name + ' ' + bin[name];
        console.log(line);
    });
}

