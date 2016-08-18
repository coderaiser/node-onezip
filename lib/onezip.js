'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const Emitter = require('events').EventEmitter;

const findit = require('findit');
const assert = require('assert');
const pipe = require('pipe-io');

const mkdirp = require('mkdirp');
const yazl = require('yazl');
const yauzl = require('yauzl');
const async = require('async');
const eachSeries = async.eachSeries;

util.inherits(OneZip, Emitter);

module.exports.pack     = onezip('pack');
module.exports.extract  = onezip('extract');

function check(from, to, files) {
    assert(typeof from === 'string', 'from should be string!');
    assert(/string|object/.test(typeof to), 'to should be string or object!');
    
    if (arguments.length > 2)
        assert(Array.isArray(files), 'array should be array!');
}

function onezip(operation) {
    return (from, to, files) => {
        return new OneZip(operation, from, to, files);
    };
}

function OneZip(operation, from, to, files) {
    this._i             = 0;
    this._n             = 0;
    
    this._percent       = 0;
    this._percentPrev   = 0;
    
    this._from          = from;
    this._to            = to;
    this._names         = [];
    
    switch(operation) {
    case 'pack':
        check(from, to, files);
        
        this._parallel(from, files, () => {
            if (this._abort)
                this.emit('end');
            else
                this._pack();
        });
        break;
    
    case 'extract':
        check(from, to);
        this._parse((error) => {
            if (!error) {
                this._extract();
            } else {
                this.emit('error', error);
                this.emit('end');
            }
        });
        break;
    
    default:
        throw Error('operations: pack or extract only');
    }
}

OneZip.prototype.abort     = function() {
    this._abort = true;
};

OneZip.prototype._parallel  = function(from, files, callback) {
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
        const filename = name.replace(`${this._from}/`, '');
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
    const from = this._from;
    const to = this._to;
    const zipfile = new yazl.ZipFile();
    
    eachSeries(this._names, (name, fn) => {
        const filename = path.join(from, name);
        
        fs.stat(filename, (error, stat) => {
            if (error)
                return fn(error);
                
            if (stat.isDirectory())
                zipfile.addEmptyDirectory(name);
            else
                zipfile.addFile(name, name);
            
            this._progress();
            this.emit('file', name);
            
            fn();
        });
    }, (error) => {
        zipfile.end();
        
        if (error) {
            this.emit('error', error);
            this.emit('end');
            return;
        }
        
        const streamFile  = typeof to === 'object' ?
            to : fs.createWriteStream(to);
        
        pipe([
            zipfile.outputStream,
            streamFile
        ], (error) => {
            if (error)
                this.emit('error', error);
            
            if (!this._abort)
                this.emit('end');
            else
                fs.unlink(to, (error) => {
                    if (error)
                        this.emit('error', error);
                    
                    this.emit('end');
                });
        });
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

OneZip.prototype._extract  = function() {
    const from = this._from;
    
    yauzl.open(from, {lazyEntries: true, autoClose: false}, (error, zipfile) => {
        if (error)
            return this.emit('error', error);
        
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
            const fileName = entry.fileName;
            const fn = (error) => {
                if (error)
                    return this.emit('error', error);
                
                this._progress();
                this.emit('file', fileName);
                zipfile.readEntry();
            };
            
            if (/\/$/.test(fileName))
                mkdirp(fileName, fn);
            else
                zipfile.openReadStream(entry, (error, readStream) => {
                    if (error)
                        return fn(error);
                    
                    this._writeFile(fileName, readStream, fn);
                });
        });
        
        zipfile.once('end', () => {
            this.emit('end');
        });
    });
};

OneZip.prototype._writeFile = function(fileName, readStream, fn) {
    mkdirp(path.dirname(fileName), (error) => {
        if (error)
            return fn(error);
        
        const writeStream = fs.createWriteStream(fileName);
        
        pipe([readStream, writeStream], fn);
    });
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

