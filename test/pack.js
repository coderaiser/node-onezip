'use strict';

const os = require('os');

const {join} = require('path');

const fs = require('fs');

const {
    readFileSync,
    unlinkSync,
    existsSync,
} = require('fs');

const test = require('supertape');
const {pack} = require('..');
const {reRequire} = require('mock-require');

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

test('onezip: pack: error: empty file list', (t) => {
    const packer = pack('hello', 'world', []);
    
    packer.on('error', (e) => {
        t.equal(e.message, 'Nothing to pack!', 'should emit error when file list is empty');
        t.end();
    });
});

test('onezip: pack: error: read', (t) => {
    const expect = 'ENOENT: no such file or directory, lstat \'hello/world\'';
    const packer = pack('hello', 'hello.zip', [
        'world',
    ]);
    
    packer.on('error', (e) => {
        t.equal(e.message, expect, 'should emit error when file not found');
        t.end();
    });
});

test('onezip: pack: error: write', (t) => {
    const expect = 'EACCES: permission denied, open \'/hello.zip\'';
    const from = join(__dirname, 'fixture');
    const packer = pack(from, '/hello.zip', [
        'onezip.txt',
    ]);
    
    packer.on('error', (e) => {
        t.equal(e.message, expect, 'should emit error when file not found');
        t.end();
    });
});

test('onezip: pack', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.on('end', () => {
        const fileTo = readFileSync(to);
        
        unlinkSync(to);
        t.ok(fileTo.length, 'should pack file');
        t.end();
    });
});

test('onezip: pack: two', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture', 'two');
    const packer = pack(fixture, to, [
        'one.txt',
        'two.txt',
    ]);
    
    packer.on('end', () => {
        const fileTo = readFileSync(to);
        
        unlinkSync(to);
        t.ok(fileTo.length, 'should pack file');
        t.end();
    });
});

test('onezip: pack: stream', (t) => {
    const to = tmpFile();
    const stream = fs.createWriteStream(to);
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, stream, [
        'onezip.txt',
    ]);
    
    packer.on('end', () => {
        const fileTo = readFileSync(to);
        
        unlinkSync(to);
        t.ok(fileTo.length, 'should pack file');
        t.end();
    });
});

test('onezip: pack: from: slash', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(`${fixture}/`, to, [
        'onezip.txt',
    ]);
    
    packer.on('end', () => {
        const fileTo = readFileSync(to);
        
        unlinkSync(to);
        t.ok(fileTo.length, 'should pack file');
        t.end();
    });
});

test('onezip: pack: abort', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.abort();
    
    packer.on('end', () => {
        t.notOk(existsSync(to), 'should not create archive');
        t.end();
    });
});

test('onezip: pack: abort', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.abort();
    
    packer.on('end', () => {
        t.notOk(existsSync(to), 'should not create archive');
        t.end();
    });
});

test('onezip: pack: abort: fast', (t) => {
    const to = tmpFile();
    const fixture = join(__dirname, 'fixture');
    const packer = pack(fixture, to, [
        'onezip.txt',
    ]);
    
    packer.abort();
    
    packer.on('end', () => {
        t.notOk(existsSync(to), 'should not create archive');
        t.end();
    });
});

test('onezip: pack: abort: unlink', (t) => {
    const {unlink} = fs;
    fs.unlink = (name, fn) => fn();
    
    const to = tmpFile();
    const dir = join(__dirname, 'fixture');
    const {pack} = reRequire('..');
    const packer = pack(dir, to, [
        'onezip.txt',
    ]);
    
    packer.on('start', () => {
        packer.abort();
    });
    
    packer.on('end', () => {
        fs.unlink = unlink;
        t.pass('should emit end');
        t.end();
    });
});

test('onezip: pack: unlink', (t) => {
    const to = tmpFile();
    const dir = join(__dirname, 'fixture');
    const packer = pack(dir, to, [
        'onezip.txt',
    ]);
    
    const {unlink} = fs;
    
    fs.unlink = (name, fn) => {
        fn();
    };
    
    packer.once('end', () => {
        fs.unlink = unlink;
        t.pass('should emit end');
        t.end();
    });
    
    packer._unlink(to);
});

test('onezip: pack: unlink: error', (t) => {
    const to = tmpFile();
    const dir = join(__dirname, '..');
    const {pack} = reRequire('..');
    const packer = pack(dir, to, [
        '.git',
    ]);
    
    const {unlink} = fs;
    
    fs.unlink = (name, fn) => {
        fn(Error('Can not remove'));
    };
    
    packer.on('error', (e) => {
        fs.unlink = unlink;
        t.ok(e.message, 'Can not remove', 'should emit error');
    });
    
    packer.on('end', () => {
        t.end();
    });
    
    packer._unlink(to);
});

test('onezip: pack: stat: error', (t) => {
    const {stat} = fs;
    
    fs.stat = (name, fn) => {
        fn(Error('Can not stat!'));
    };
    
    const {pack} = reRequire('..');
    
    const packer = pack(__dirname, tmpFile(), [
        'fixture',
    ]);
    
    packer.on('error', (error) => {
        fs.stat = stat;
        t.equal(error.message, 'Can not stat!', 'should not create directory');
        t.end();
    });
});

test('onezip: pack: _readStream: error', (t) => {
    const expect = 'ENOENT: no such file or directory, open \'hello world\'';
    const packer = pack(__dirname, tmpFile(), [
        'fixture',
    ]);
    
    packer.on('error', (error) => {
        t.equal(error.message, expect, 'should emit error');
        t.end();
    });
    
    packer._createReadStream('hello world');
});

test('onezip: pack: _onOpenReadStream: error', (t) => {
    const expect = 'Can not open read stream';
    const packer = pack(__dirname, tmpFile(), [
        'fixture',
    ]);
    
    packer.on('error', (error) => {
        t.equal(error.message, expect, 'should emit error when can not open read stream');
        t.end();
    });
    
    const openReadStream = packer._onOpenReadStream();
    
    openReadStream(Error(expect));
});

