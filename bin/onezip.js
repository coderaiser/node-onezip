#!/usr/bin/env node

import process from 'node:process';
import path from 'node:path';
import yargsParser from 'yargs-parser';
import {glob} from 'glob';
import {onezip} from '../lib/onezip.js';
import info from '../package.json' with {
    type: 'json',
};

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
    await help();
else if (args.pack)
    main('pack', await getName(args.pack));
else if (args.extract)
    main('extract', await getName(args.extract));
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

async function getName(str) {
    const files = await glob(str);
    
    if (!files.length)
        return console.error('file not found');
    
    return files[0];
}

function version() {
    console.log('v' + info.version);
}

async function help() {
    const {default: bin} = await import('../help.json', {
        with: {
            type: 'json',
        },
    });
    
    const usage = `Usage: ${info.name} [path]`;
    
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
            const {name} = info;
            console.error(`'${cmd}' is not a ${name} option. See '${name} --help'.`);
            process.exit(-1);
        }
    }
}
