'use strict';

const {EventEmitter} = require('events');
const {tmpdir} = require('os');
const {
    sep,
    join
} = require('path');
const {
    readFileSync,
    unlinkSync,
    rmdirSync,
    mkdtempSync
} = require('fs');

const test = require('tape');
const {extract}= require('..');

const fixtureZip = () => join(__dirname, 'fixture', 'onezip.txt.zip');
const tmp = () => mkdtempSync(tmpdir() + sep);

test('onezip: extract: no args', (t) => {
    t.throws(extract, /from should be a string!/, 'should throw when no args');
    t.end();
});

test('onezip: extract: to', (t) => {
    const fn = () => extract('hello');
    t.throws(fn, /to should be string or object!/, 'should throw when no to');
    t.end();
});

test('onezip: extract: error: file not found', (t) => {
    const expect = 'ENOENT: no such file or directory, open \'hello.zip\'';
    const extracter = extract('hello.zip', 'hello');
    
    extracter.on('error', (e) => {
        t.equal(e.message,  expect, 'should emit error when file not found');
        t.end();
    });
});

test('onezip: extract: error: wrong file type', (t) => {
    const expect = 'end of central directory record signature not found';
    const extracter = extract(fixtureZip(), tmp());
    
    extracter.on('error', ({message}) => {
        t.equal(message, expect, 'should emit error when can not extract')
        t.end();
    });
    
    extracter._extract(__filename);
});

test('onezip: extract', (t) => {
    const to = mkdtempSync(tmpdir() + sep);
    const fixture = join(__dirname, 'fixture');
    const from = join(fixture, 'onezip.txt.zip');
    const extracter = extract(from, to);
    
    extracter.on('end', () => {
        const pathUnpacked = join(to, 'onezip.txt');
        const pathFixture= join(fixture, 'onezip.txt');
        
        const fileUnpacked = readFileSync(pathUnpacked);
        const fileFixture = readFileSync(pathFixture);
        
        unlinkSync(pathUnpacked);
        rmdirSync(to);
        
        t.deepEqual(fileFixture, fileUnpacked, 'should extract file');
        t.end();
    });
});

test('onezip: exract: writeFile', (t) => {
    delete require.cache[require.resolve('..')];
    const mkdirp = require('mkdirp');
    
    let was;
    
    require.cache[require.resolve('mkdirp')].exports = (name, fn) => {
        if (!was) {
            was = true;
            return mkdirp(name, fn);
        }
        
        fn(Error('Can not create directory!'));
    };
    
    const {extract} = require('..');
    
    const to = mkdtempSync(tmpdir() + sep);
    const from = join(__dirname, 'fixture', 'fixture.zip');
    
    const extracter = extract(from, to, [
        'fixture'
    ]);
    
    extracter.on('error', ({message}) => {
        require.cache[require.resolve('mkdirp')].exports = mkdirp;
        t.equal(message, 'Can not create directory!', 'should not create directory');
        t.end();
    });
});
