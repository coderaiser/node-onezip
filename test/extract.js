'use strict';

const {once} = require('node:events');
const {tmpdir} = require('node:os');

const {sep, join} = require('node:path');

const {
    readFileSync,
    unlinkSync,
    rmdirSync,
    mkdtempSync,
} = require('node:fs');

const {tryCatch} = require('try-catch');

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
    const expect = `ENOENT: no such file or directory, open 'hello.zip'`;
    const extractor = extract('hello.zip', 'hello');
    
    const [e] = await once(extractor, 'error');
    
    t.equal(e.message, expect, 'should emit error when file not found');
    t.end();
});

test('onezip: extract: error: wrong file type', async (t) => {
    const to = tmp();
    const expect = 'End of central directory record signature not found';
    const extractor = extract(fixtureZip(), to);
    
    const _extract = extractor._extract.bind(extractor, __filename);
    
    const [first] = await Promise.all([
        once(extractor, 'error'),
        wait(_extract),
    ]);
    
    const [{message}] = first;
    
    await once(extractor, 'end');
    rimraf.sync(to);
    
    t.match(message, expect, 'should emit error when can not extract');
    t.end();
});

test('onezip: extract', async (t) => {
    const to = tmp();
    const fixture = join(__dirname, 'fixture');
    const from = join(fixture, 'onezip.txt.zip');
    const extractor = extract(from, to);
    
    await once(extractor, 'end');
    
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
    const extractor = extract(from, to);
    
    await once(extractor, 'end');
    
    const pathUnpacked = join(to, 'dir', 'hello.txt');
    const fileUnpacked = readFileSync(pathUnpacked, 'utf8');
    
    rimraf.sync(to);
    
    t.equal(fileUnpacked, 'world\n', 'should extract directory');
    t.end();
});

test('onezip: extract: dir + file: no error', async (t) => {
    const to = tmp();
    const from = join(__dirname, 'fixture', 'dir+file.zip');
    const extractor = extract(from, to);
    
    await once(extractor, 'end');
    
    const pathUnpacked = join(to, 'file1.txt');
    const fileUnpacked = readFileSync(pathUnpacked, 'utf8');
    
    rimraf.sync(to);
    
    t.equal(fileUnpacked, '', 'should extract directory');
    t.end();
});

test('onezip: extract: mkdir: error', async (t) => {
    const mkdir = stub().throws(Error('Can not create directory!'));
    const fs = require('node:fs/promises');
    
    mockRequire('node:fs/promises', {
        ...fs,
        mkdir,
    });
    const {extract} = reRequire('..');
    
    const to = `${tmpdir()}/onezip`;
    const from = join(__dirname, 'fixture', 'dir.zip');
    
    const extractor = extract(from, to);
    const [{message}] = await once(extractor, 'error');
    
    stopAll();
    rimraf.sync(to);
    
    t.equal(message, 'Can not create directory!', 'should not create directory');
    t.end();
});

test('onezip: extract: mkdir error on file write: mocked', async (t) => {
    const mkdir = stub().throws(Error('Can not create directory!'));
    const fs = require('node:fs/promises');
    
    mockRequire('node:fs/promises', {
        ...fs,
        mkdir,
    });
    const {extract} = reRequire('..');
    
    const to = `${tmpdir()}/onezip`;
    const from = join(__dirname, 'fixture', 'dir+file.zip');
    
    const extractor = extract(from, to);
    const [{message}] = await once(extractor, 'error');
    
    rimraf.sync(to);
    stopAll();
    
    t.equal(message, 'Can not create directory!', 'should not create directory');
    t.end();
});

test('onezip: extract: mkdir error on file write', async (t) => {
    const to = `${tmpdir()}/onezip`;
    const from = join(__dirname, 'fixture', '101.zip');
    
    const extractor = extract(from, to);
    const [progress] = await once(extractor, 'progress');
    
    await once(extractor, 'end');
    
    rimraf.sync(to);
    
    t.equal(progress, 1);
    t.end();
});
