'use strict';

const process = require('node:process');

const {
    createReadStream,
    createWriteStream,
} = require('node:fs');

const {
    mkdir,
    stat,
    unlink,
} = require('node:fs/promises');

const path = require('node:path');
const {EventEmitter} = require('node:events');
const {inherits, promisify} = require('node:util');
const assert = require('node:assert');

const pipe = require('pipe-io');
const {tryToCatch} = require('try-to-catch');
const yazl = require('yazl');
const yauzl = require('yauzl');

const superfind = require('./superfind');
const isString = (a) => typeof a === 'string';
const {dirname} = path;

inherits(OneZip, EventEmitter);

module.exports = onezip;
module.exports.pack = onezip('pack');
module.exports.extract = onezip('extract');

function check(from, to, files) {
    assert(isString(from), 'from should be a string!');
    assert(/string|object/.test(typeof to), 'to should be string or object!');
    
    if (arguments.length > 2)
        assert(Array.isArray(files), 'files should be an array!');
}

function checkOperation(operation) {
    if (!/^(pack|extract)$/.test(operation))
        throw Error('operations could be "pack" or "extract" only!');
}

function onezip(operation) {
    checkOperation(operation);
    
    return (from, to, files) => {
        return new OneZip(operation, from, to, files);
    };
}

function OneZip(operation, from, to, files) {
    if (operation === 'extract')
        check(from, to);
    else
        check(from, to, files);
    
    process.nextTick(async () => {
        EventEmitter.call(this);
        this._i = 0;
        this._n = 0;
        
        this._percent = 0;
        this._percentPrev = 0;
        
        this._names = [];
        
        if (operation === 'pack') {
            this._from = endSlash(from);
            this._to = to;
            
            if (!files.length)
                return this.emit('error', Error('Nothing to pack!'));
            
            await this._parallel(from, files);
            
            if (this._abort)
                return this.emit('end');
            
            this._pack();
            
            return;
        }
        
        this._from = from;
        this._to = endSlash(to);
        
        const [error] = await tryToCatch(this._parse.bind(this), from);
        
        if (error)
            return this.emit('error', error);
        
        this._extract(from);
    });
}

OneZip.prototype.abort = function() {
    this._abort = true;
};

OneZip.prototype._parallel = async function(from, files) {
    const promises = [];
    
    for (const name of files) {
        const full = path.join(from, name);
        promises.push(this._findFiles(full));
    }
    
    const all = Promise.all.bind(Promise, promises);
    const [error] = await tryToCatch(all);
    
    if (error) {
        this.emit('error', error);
        this.abort();
    }
};

OneZip.prototype._findFiles = async function(filename) {
    const {names} = await superfind(filename);
    
    this._n = names.length;
    this._names = names;
};

OneZip.prototype._pack = async function() {
    this.emit('start');
    
    const {
        _to,
        _from,
        _names,
    } = this;
    
    const zipfile = new yazl.ZipFile();
    
    const end = (name) => {
        this.emit('file', name);
        this._progress();
    };
    
    for (const _name of _names) {
        const filename = _name.replace(_from, '');
        const [error, data] = await tryToCatch(stat, _name);
        
        if (error)
            return this.emit('error', error);
        
        if (data.isDirectory()) {
            zipfile.addEmptyDirectory(filename);
            end(_name);
            continue;
        }
        
        const stream = this._createReadStream(_name, () => {
            end(_name);
        });
        
        zipfile.addReadStream(stream, filename);
    }
    
    zipfile.end();
    
    const streamFile = typeof _to === 'object' ? _to : createWriteStream(_to);
    
    const [errorPipe] = await tryToCatch(pipe, [
        zipfile.outputStream,
        streamFile,
    ]);
    
    if (errorPipe)
        return this.emit('error', errorPipe);
    
    if (!this._abort)
        return this.emit('end');
    
    await this._unlink(_to);
};

OneZip.prototype._createReadStream = function(filename, end) {
    return createReadStream(filename)
        .on('error', (error) => {
            this.emit('error', error);
        })
        .on('end', end);
};

OneZip.prototype._onOpenReadStream = function(success) {
    return (error, readStream = {}) => {
        if (error)
            return this.emit('error', error);
        
        success(readStream);
    };
};

OneZip.prototype._unlink = async function(to) {
    const [error] = await tryToCatch(unlink, to);
    
    if (error)
        return this.emit('error', error);
    
    this.emit('end');
};

OneZip.prototype._parse = promisify(function(from, fn) {
    yauzl.open(from, (error, zipfile) => {
        if (error)
            return fn(error);
        
        zipfile.on('entry', () => {
            ++this._n;
        });
        
        zipfile.once('end', fn);
    });
});

OneZip.prototype._extract = function(from) {
    this.emit('start');
    
    const lazyEntries = true;
    const autoClose = true;
    
    const options = {
        lazyEntries,
        autoClose,
    };
    
    yauzl.open(from, options, (error, zipfile) => {
        const handleError = (error) => {
            this.emit('error', error);
        };
        
        if (error)
            return handleError(error);
        
        zipfile.readEntry();
        zipfile.on('entry', async (entry) => {
            const {fileName} = entry;
            const fn = (error) => {
                if (error)
                    return handleError(error);
                
                this._progress();
                this.emit('file', fileName);
                zipfile.readEntry();
            };
            
            const name = path.join(this._to, fileName);
            
            if (fileName.endsWith('/')) {
                const [e] = await tryToCatch(mkdir, name, {
                    recursive: true,
                });
                
                return fn(e);
            }
            
            zipfile.openReadStream(entry, this._onOpenReadStream(async (readStream) => {
                let e;
                
                [e] = await tryToCatch(mkdir, dirname(name), {
                    recursive: true,
                });
                
                if (e)
                    return fn(e);
                
                [e] = await tryToCatch(pipe, [readStream, createWriteStream(name)]);
                
                fn(e);
            }));
        });
        
        zipfile.once('end', () => {
            this.emit('end');
        });
    });
};

OneZip.prototype._progress = function() {
    ++this._i;
    
    const value = Math.round(this._i * 100 / this._n);
    
    this._percent = value;
    
    if (value !== this._percentPrev) {
        this._percentPrev = value;
        this.emit('progress', value);
    }
};

function endSlash(str) {
    const last = str.length - 1;
    
    if (str[last] === path.sep)
        return str;
    
    return str + path.sep;
}
