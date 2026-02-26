import {once} from 'node:events';
import os from 'node:os';
import {join, dirname} from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {tryCatch} from 'try-catch';
import {test, stub} from 'supertape';
import wait from '@iocmd/wait';
import {pack} from '../lib/onezip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
    readFileSync,
    unlinkSync,
    existsSync,
} = fs;

const {unlink} = fs.promises;
const tmpFile = () => join(os.tmpdir(), `${Math.random()}.zip`);

test('onezip: pack: no args', (t) => {
    const [error] = tryCatch(pack);
    
    t.equal(error.message, 'from should be a string!', 'should throw when no args');
    t.end();
});

test('onezip: pack: to', (t) => {
    const [error] = tryCatch(pack, 'hello');
    
    t.equal(error.message, 'to should be string or object!', 'should throw when no to');
    t.end();
});

test('onezip: pack: files', (t) => {
    const [error] = tryCatch(pack, 'hello', 'world');
    
    t.equal(error.message, 'files should be an array!', 'should throw when no files');
    t.end();
});

test('onezip: pack: error: empty file list', async (t) => {
    const packer = pack('hello', 'world', []);
    
    const [e] = await once(packer, 'error');
    
    t.equal(e.message, 'Nothing to pack!', 'should emit error when file list is empty');
    t.end();
});

test('onezip: pack: error: read', async (t) => {
    const expect = `ENOENT: no such file or directory, lstat 'hello/world'`;
    const packer = pack('hello', 'hello.zip', ['world']);
    
    const [e] = await once(packer, 'error');
    
    t.equal(e.message, expect, 'should emit error when file not found');
    t.end();
});

test('onezip: pack: error: write', async (t) => {
    const from = new URL('fixture', import.meta.url).pathname;
    const packer = pack(from, '/hello.zip', ['onezip.txt']);
    
    const [e] = await once(packer, 'error');
    
    t.match(e.message, /EACCESS|EROFS/, 'should emit error when file not found');
    t.end();
});

test('onezip: pack', async (t) => {
    const to = tmpFile();
    const fixture = new URL('fixture', import.meta.url).pathname;
    const packer = pack(fixture, to, ['onezip.txt']);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: two', async (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture', 'two');
    const packer = pack(fixture, to, ['one.txt', 'two.txt']);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: stream', async (t) => {
    const to = tmpFile();
    const stream = fs.createWriteStream(to);
    const fixture = new URL('fixture', import.meta.url).pathname;
    
    const packer = pack(fixture, stream, ['onezip.txt']);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: from: slash', async (t) => {
    const to = tmpFile();
    const fixture = new URL('fixture', import.meta.url).pathname;
    const packer = pack(`${fixture}/`, to, ['onezip.txt']);
    
    await once(packer, 'end');
    const fileTo = readFileSync(to);
    
    unlinkSync(to);
    
    t.ok(fileTo.length, 'should pack file');
    t.end();
});

test('onezip: pack: abort', async (t) => {
    const to = tmpFile();
    const fixture = new URL('fixture', import.meta.url).pathname;
    const packer = pack(fixture, to, ['onezip.txt']);
    
    packer.abort();
    
    await once(packer, 'end');
    
    t.notOk(existsSync(to), 'should not create archive');
    t.end();
});

test('onezip: pack: abort: fast', (t) => {
    const to = tmpFile();
    const fixture = new URL('fixture', import.meta.url).pathname;
    const packer = pack(fixture, to, ['onezip.txt']);
    
    packer.abort();
    
    once(packer, 'end');
    
    t.notOk(existsSync(to), 'should not create archive');
    t.end();
});

test('onezip: pack: abort: unlink', async (t) => {
    const {unlink} = fs.promises;
    
    const to = tmpFile();
    const dir = new URL('fixture', import.meta.url).pathname;
    
    const packer = pack(dir, to, ['onezip.txt'], {
        unlink: stub().resolves(),
    });
    
    await once(packer, 'start');
    
    packer.abort();
    
    await once(packer, 'end');
    await unlink(to);
    
    t.pass('should emit end');
    t.end();
});

test('onezip: pack: unlink', async (t) => {
    const to = tmpFile();
    const dir = new URL('fixture', import.meta.url).pathname;
    
    const {unlink} = fs.promises;
    const unlinkStub = stub();
    
    fs.promises.unlink = unlinkStub;
    
    const packer = pack(dir, to, ['onezip.txt']);
    
    await once(packer, 'end');
    await unlink(to);
    
    fs.promises.unlink = unlink;
    
    t.notCalled(unlinkStub, 'should not call unlink');
    t.end();
});

test('onezip: pack: unlink: error', async (t) => {
    const to = tmpFile();
    const dir = new URL('..', import.meta.url).pathname;
    
    const unlinkStub = stub().rejects(Error('Can not remove'));
    
    const packer = pack(dir, to, ['.git'], {
        unlink: unlinkStub,
    });
    
    const _unlink = packer._unlink.bind(packer, to);
    
    const [first] = await Promise.all([
        once(packer, 'error'),
        wait(_unlink),
    ]);
    
    const [e] = first;
    
    await once(packer, 'end');
    await unlink(to);
    
    t.ok(e.message, 'Can not remove', 'should emit error');
    t.end();
});

test('onezip: pack: stat: error', async (t) => {
    const stat = stub().rejects(Error('Can not stat!'));
    
    const packer = pack(__dirname, tmpFile(), ['fixture'], {
        stat,
    });
    
    const [error] = await once(packer, 'error');
    
    t.equal(error.message, 'Can not stat!', 'should not create directory');
    t.end();
});

test('onezip: pack: _readStream: error', async (t) => {
    const to = tmpFile();
    const expect = `ENOENT: no such file or directory, open 'hello world'`;
    const packer = pack(__dirname, to, ['fixture']);
    
    const end = stub();
    
    packer._createReadStream('hello world', end);
    const [error] = await once(packer, 'error');
    
    await once(packer, 'end');
    await unlink(to);
    
    t.equal(error.message, expect, 'should emit error');
    t.end();
});

test('onezip: pack: _onOpenReadStream: error', async (t) => {
    const to = tmpFile();
    const expect = 'Can not open read stream';
    const packer = pack(__dirname, to, ['fixture']);
    
    const openReadStream = packer._onOpenReadStream();
    const open = openReadStream.bind(null, Error(expect));
    
    const [first] = await Promise.all([
        once(packer, 'error'),
        wait(open),
    ]);
    
    const [error] = first;
    
    await once(packer, 'end');
    await unlink(to);
    
    t.equal(error.message, expect, 'should emit error when can not open read stream');
    t.end();
});
