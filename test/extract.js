'use strict';

const tryCatch = require('try-catch');

const {once} = require('events');
const {tmpdir} = require('os');
const {
    sep,
    join,
} = require('path');
const {
    readFileSync,
    unlinkSync,
    rmdirSync,
    mkdtempSync,
} = require('fs');

const rimraf = require('rimraf');
const {test, stub} = require('supertape');
const wait = require('@iocmd/wait');

const mockRequire = require('mock-require');

const {extract} = require('..');

const {reRequire, stopAll} = mockRequire;

const fixtureZip = () => join(__dirname, 'fixture', 'onezip.txt.zip');
const tmp = () => mkdtempSync(tmpdir() + sep);

test('onezip: extract: no args', (t) => {
    const [error] = tryCatch(extract);
    
    t.equal(error.message, 'from should be a string!', 'should throw when no args');
    t.end();
});

test('onezip: extract: to', (t) => {
    const [error] = tryCatch(extract, 'hello');
    
    t.equal(error.message, 'to should be string or object!', 'should throw when no to');
    t.end();
});

test('onezip: extract: error: file not found', async (t) => {
    const expect = 'ENOENT: no such file or directory, open \'hello.zip\'';
    const extracter = extract('hello.zip', 'hello');
    
    const [e] = await once(extracter, 'error');
    
    t.equal(e.message, expect, 'should emit error when file not found');
    t.end();
});

test('onezip: extract: error: wrong file type', async (t) => {
    const to = tmp();
    const expect = 'end of central directory record signature not found';
    const extracter = extract(fixtureZip(), to);
    
    const _extract = extracter._extract.bind(extracter, __filename);
    
    const [first] = await Promise.all([
        once(extracter, 'error'),
        wait(_extract),
    ]);
    
    const [{message}] = first;
    
    await once(extracter, 'end');
    rimraf.sync(to);
    
    t.equal(message, expect, 'should emit error when can not extract');
    t.end();
});

test('onezip: extract', async (t) => {
    const to = tmp();
    const fixture = join(__dirname, 'fixture');
    const from = join(fixture, 'onezip.txt.zip');
    const extracter = extract(from, to);
    
    await once(extracter, 'end');
    
    const pathUnpacked = join(to, 'onezip.txt');
    const pathFixture = join(fixture, 'onezip.txt');
    
    const fileUnpacked = readFileSync(pathUnpacked);
    const fileFixture = readFileSync(pathFixture);
    
    unlinkSync(pathUnpacked);
    rmdirSync(to);
    
    t.deepEqual(fileFixture, fileUnpacked, 'should extract file');
    t.end();
});

test('onezip: extract: dir', async (t) => {
    const to = tmp();
    const fixture = join(__dirname, 'fixture');
    const from = join(fixture, 'dir.zip');
    const extracter = extract(from, to);
    
    await once(extracter, 'end');
    
    const pathUnpacked = join(to, 'dir', 'hello.txt');
    const fileUnpacked = readFileSync(pathUnpacked, 'utf8');
    
    rimraf.sync(to);
    
    t.deepEqual(fileUnpacked, 'world\n', 'should extract directory');
    t.end();
});

test('onezip: extract: dir + file: no error', async (t) => {
    const to = tmp();
    const from = join(__dirname, 'fixture', 'dir+file.zip');
    const extracter = extract(from, to);
    
    await once(extracter, 'end');
    
    const pathUnpacked = join(to, 'file1.txt');
    const fileUnpacked = readFileSync(pathUnpacked, 'utf8');
    
    rimraf.sync(to);
    
    t.equal(fileUnpacked, '', 'should extract directory');
    t.end();
});

test('onezip: exract: mkdir: error', async (t) => {
    const mkdir = stub().throws(Error('Can not create directory!'));
    const fs = require('fs/promises');
    
    mockRequire('fs/promises', {
        ...fs,
        mkdir,
    });
    const {extract} = reRequire('..');
    
    const to = tmpdir();
    const from = join(__dirname, 'fixture', 'dir.zip');
    
    const extracter = extract(from, to);
    const [{message}] = await once(extracter, 'error');
    
    stopAll();
    rimraf.sync(to);
    
    t.equal(message, 'Can not create directory!', 'should not create directory');
    t.end();
});

test('onezip: exract: mkdir error on file write', async (t) => {
    const mkdir = stub().throws(Error('Can not create directory!'));
    const fs = require('fs/promises');
    
    mockRequire('fs/promises', {
        ...fs,
        mkdir,
    });
    const {extract} = reRequire('..');
    
    const to = tmpdir();
    const from = join(__dirname, 'fixture', 'dir+file.zip');
    
    const extracter = extract(from, to);
    const [{message}] = await once(extracter, 'error');
    
    rimraf.sync(to);
    stopAll();
    
    t.equal(message, 'Can not create directory!', 'should not create directory');
    t.end();
});

test('onezip: exract: mkdir error on file write', async (t) => {
    const to = tmpdir();
    const from = join(__dirname, 'fixture', '101.zip');
    
    const extracter = extract(from, to);
    const [progress] = await once(extracter, 'progress');
    await once(extracter, 'end');
    
    stopAll();
    rimraf.sync(to);
    
    t.equal(progress, 1);
    t.end();
});
