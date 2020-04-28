'use strict';

const {once} = require('events');
const os = require('os');
const {join} = require('path');
const fs = require('fs');

const {
    readFileSync,
    unlinkSync,
    existsSync,
} = require('fs');

const test = require('supertape');
const stub = require('@cloudcmd/stub');
const {reRequire} = require('mock-require');
const wait = require('@iocmd/wait');

const {pack} = require('..');

const tmpFile = () => join(os.tmpdir(), `${Math.random()}.zip`);

test('onezip: pack: no args', (t) => {
    t.throws(pack, /from should be a string!/, 'should throw when no args');
    t.end();
});

test('onezip: pack: to', (t) => {
    const fn = () => pack('hello');
    t.throws(fn, /to should be string or object!/, 'should throw when no to');
    t.end();
});

test('onezip: pack: files', (t) => {
    const fn = () => pack('hello', 'world');
    
    t.throws(fn, /files should be an array!/, 'should throw when no files');
    t.end();
});

test('onezip: pack: error: empty file list', async (t) => {
    const packer = pack('hello', 'world', []);
    
    const [e] = await once(packer, 'error');
    
    t.equal(e.message, 'Nothing to pack!', 'should emit error when file list is empty');
    t.end();
});

test('onezip: pack: error: read', async (t) => {
    const expect = 'ENOENT: no such file or directory, lstat \'hello/world\'';
    const packer = pack('hello', 'hello.zip', [
        'world',
    ]);
    
    const [e] = await once(packer, 'error');
    
    t.equal(e.message, expect, 'should emit error when file not found');
    t.end();
});

test('onezip: pack: error: write', async (t) => {
    const expect = 'EACCES: permission denied, open \'/hello.zip\'';
    const from = join(__dirname, 'fixture');
    const packer = pack(from, '/hello.zip', [
        'onezip.txt',
    ]);
    
    const [e] = await once(packer, 'error');
    
    t.equal(e.message, expect, 'should emit error when file not found');
    t.end();
});

test('onezip: pack', async (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: two', async (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture', 'two');
    const packer = pack(fixture, to, [
        'one.txt',
        'two.txt',
    ]);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: stream', async (t) => {
    const to = tmpFile();
    const stream = fs.createWriteStream(to);
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, stream, [
        'onezip.txt',
    ]);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: from: slash', async (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(`${fixture}/`, to, [
        'onezip.txt',
    ]);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: abort', async (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.abort();
    
    await once(packer, 'end');
    
    t.notOk(existsSync(to), 'should not create archive');
    t.end();
});

test('onezip: pack: abort', async (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.abort();
    
    await once(packer, 'end');
    
    t.notOk(existsSync(to), 'should not create archive');
    t.end();
});

test('onezip: pack: abort: fast', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.abort();
    
    once(packer, 'end');
    
    t.notOk(existsSync(to), 'should not create archive');
    t.end();
});

test('onezip: pack: abort: unlink', async (t) => {
    const {unlink} = fs.promises;
    fs.promises.unlink = async () => {};
    
    const to = tmpFile();
    const dir = join(__dirname, 'fixture');
    const {pack} = reRequire('..');
    const packer = pack(dir, to, [
        'onezip.txt',
    ]);
    
    await once(packer, 'start');
    
    packer.abort();
    
    await once(packer, 'end');
    
    fs.promises.unlink = unlink;
    
    t.pass('should emit end');
    t.end();
});

test('onezip: pack: unlink', async (t) => {
    const to = tmpFile();
    const dir = join(__dirname, 'fixture');
    
    const {unlink} = fs.promises;
    const unlinkStub = stub();
    fs.promises.unlink = unlinkStub;
    
    const packer = pack(dir, to, [
        'onezip.txt',
    ]);
    
    await once(packer, 'end');
    await unlink(to);
    
    fs.promises.unlink = unlink;
    
    t.notOk(unlinkStub.called, 'should not call unlink');
    t.end();
});

test('onezip: pack: unlink: error', async (t) => {
    const to = tmpFile();
    const dir = join(__dirname, '..');
    const {pack} = reRequire('..');
    const packer = pack(dir, to, [
        '.git',
    ]);
    
    const {unlink} = fs.promises;
    
    fs.promises.unlink = async () => {
        throw Error('Can not remove');
    };
    
    const _unlink = packer._unlink.bind(packer, to);
    const [first] = await Promise.all([
        once(packer, 'error'),
        wait(_unlink),
    ]);
    
    const [e] = first;
    
    await once(packer, 'end'),
    
    fs.promises.unlink = unlink;
    
    t.ok(e.message, 'Can not remove', 'should emit error');
    t.end();
});

test('onezip: pack: stat: error', async (t) => {
    const {stat} = fs.promises;
    
    fs.promises.stat = async () => {
        throw Error('Can not stat!');
    };
    
    const {pack} = reRequire('..');
    
    const packer = pack(__dirname, tmpFile(), [
        'fixture',
    ]);
    
    const [error] = await once(packer, 'error');
    
    fs.promises.stat = stat;
    t.equal(error.message, 'Can not stat!', 'should not create directory');
    t.end();
});

test('onezip: pack: _readStream: error', async (t) => {
    const expect = 'ENOENT: no such file or directory, open \'hello world\'';
    const packer = pack(__dirname, tmpFile(), [
        'fixture',
    ]);
    
    packer._createReadStream('hello world');
    const [error] = await once(packer, 'error');
    
    t.equal(error.message, expect, 'should emit error');
    t.end();
});

test('onezip: pack: _onOpenReadStream: error', async (t) => {
    const expect = 'Can not open read stream';
    const packer = pack(__dirname, tmpFile(), [
        'fixture',
    ]);
    
    const openReadStream = packer._onOpenReadStream();
    const open = openReadStream.bind(null, Error(expect));
    
    const [first] = await Promise.all([
        once(packer, 'error'),
        wait(open),
    ]);
    
    const [error] = first;
    
    t.equal(error.message, expect, 'should emit error when can not open read stream');
    t.end();
});

