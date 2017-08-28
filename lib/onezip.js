'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const Emitter = require('events').EventEmitter;

const findit = require('findit');
const assert = require('assert');
const pipe = require('pipe-io/legacy');

const mkdirp = require('mkdirp');
const yazl = require('yazl');
const yauzl = require('yauzl');
const eachSeries = require('itchy/legacy');

util.inherits(OneZip, Emitter);

module.exports          = onezip;
module.exports.pack     = onezip('pack');
module.exports.extract  = onezip('extract');

function check(from, to, files) {
    assert(typeof from === 'string', 'from should be a string!');
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
    
    process.nextTick(() => {
        Emitter.call(this);
        this._i             = 0;
        this._n             = 0;
        
        this._percent       = 0;
        this._percentPrev   = 0;
        
        this._names         = [];
        
        switch(operation) {
        case 'pack':
            this._from = endSlash(from);
            this._to = to;
            
            if (!files.length)
                return this.emit('error', Error('Nothing to pack!'));
            
            this._parallel(from, files, () => {
                if (this._abort)
                    return this.emit('end');
                
                this._pack();
            });
            break;
        
        case 'extract':
            this._from = from;
            this._to = endSlash(to);
            this._parse((error) => {
                if (!error)
                    return this._extract(this._from);
                
                this.emit('error', error);
            });
            break;
        }
    });
}

OneZip.prototype.abort = function() {
    this._abort = true;
};

OneZip.prototype._parallel = function(from, files, callback) {
    let i = files.length;
    
    const fn = () => {
        if (!--i)
            callback();
    };
    
    files.forEach((name) => {
        const full = path.join(from, name);
        
        this._findFiles(full, fn);
    });
};

OneZip.prototype._findFiles = function(filename, fn) {
    const finder = findit(filename);
    const inc = (name) => {
        const filename = name.replace(`${this._from}`, '');
        this._names.push(filename);
        ++this._n;
    };
    
    finder.on('file', inc);
    finder.on('error', (error) => {
        this.emit('error', error);
        this.abort();
    });
    
    finder.on('directory', inc);
    finder.on('link', inc);
    finder.on('end', fn);
};

OneZip.prototype._pack = function() {
    this.emit('start');
    
    const from = this._from;
    const to = this._to;
    const zipfile = new yazl.ZipFile();
    
    eachSeries(this._names, (name, fn) => {
        const filename = path.join(from, name);
        
        fs.stat(filename, (error, stat) => {
            if (error)
                return fn(error);
            
            const end = (name) => {
                this.emit('file', name);
                this._progress();
            };
            
            if (stat.isDirectory()) {
                zipfile.addEmptyDirectory(name);
                end(name);
            } else {
                const stream = this._createReadStream(filename, () => {
                    end(name);
                });
                
                zipfile.addReadStream(stream, name);
            }
            
            fn();
        });
    }, (error) => {
        if (error)
            return this.emit('error', error);
        
        zipfile.end();
        
        const streamFile = typeof to === 'object' ?
            to : fs.createWriteStream(to);
        
        pipe([
            zipfile.outputStream,
            streamFile,
        ], (error) => {
            if (error)
                return this.emit('error', error);
             
            if (!this._abort)
                return this.emit('end');
            
            this._unlink(to);
        });
    });
};

OneZip.prototype._createReadStream = function(filename, end) {
    return fs.createReadStream(filename)
        .on('error', (error) => {
            this.emit('error', error);
        })
        .on('end', () => {
            end();
        });
};

OneZip.prototype._onOpenReadStream = function(success) {
    return (error, readStream) => {
        if (error)
            return this.emit('error', error);
        
        success(readStream);
    };
};

OneZip.prototype._unlink = function(to) {
    fs.unlink(to, (error) => {
        if (error)
            return this.emit('error', error);
        
        this.emit('end');
    });
};

OneZip.prototype._parse = function(fn) {
    const from = this._from;
    
    yauzl.open(from, (error, zipfile) => {
        if (error)
            return fn(error);
        
        zipfile.on('entry', () => {
            ++this._n;
        });
        
        zipfile.once('end', () => {
            fn();
        });
    });
};

OneZip.prototype._extract = function(from) {
    this.emit('start');
    
    const lazyEntries = true;
    const autoClose = false;
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
        zipfile.on('entry', (entry) => {
            const fileName = entry.fileName;
            const fn = (error) => {
                if (error)
                    return handleError(error);
                
                this._progress();
                this.emit('file', fileName);
                zipfile.readEntry();
            };
            
            const name = path.join(this._to, fileName);
            
            if (/\/$/.test(fileName))
                return mkdirp(name, fn);
            
            zipfile.openReadStream(entry, this._onOpenReadStream((readStream) => {
                this._writeFile(name, readStream, fn);
            }));
        });
        
        zipfile.once('end', () => {
            this.emit('end');
        });
    });
};

OneZip.prototype._writeFile = function(fileName, readStream, fn) {
    const writeStream = fs.createWriteStream(fileName);
    
    pipe([readStream, writeStream], fn);
};

OneZip.prototype._progress  = function() {
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

