'use strict';
var fs          = require('fs'),
    path        = require('path'),
    zlib        = require('zlib'),
    util        = require('util'),
    
    findit      = require('findit'),
    assert      = require('assert'),
    Emitter     = require('events').EventEmitter,
    
    pipe        = require('pipe-io');

const mkdirp = require('mkdirp');
const yazl = require('yazl');
const yauzl = require('yauzl');

util.inherits(Jaguar, Emitter);

module.exports.pack     = jaguar('pack');
module.exports.extract  = jaguar('extract');

function check(from, to, files) {
    assert(typeof from === 'string', 'from should be string!');
    assert(/string|object/.test(typeof to), 'to should be string or object!');
    
    if (arguments.length > 2)
        assert(Array.isArray(files), 'array should be array!');
}

function jaguar(operation) {
    return function(from, to, files) {
        var emitter;
        
        emitter = new Jaguar(operation, from, to, files);
        
        return emitter;
    };
}

function Jaguar(operation, from, to, files) {
    var self            = this;
    
    this._i             = 0;
    this._n             = 0;
    
    this._percent       = 0;
    this._percentPrev   = 0;
    
    this._from          = from;
    this._to            = to;
    
    switch(operation) {
    case 'pack':
        this._names     = files.slice();
        check(from, to, files);
        
        this._parallel(from, files, function() {
            if (self._abort)
                self.emit('end');
            else
                self._pack();
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

Jaguar.prototype.abort     = function() {
    this._abort = true;
};

Jaguar.prototype._parallel  = function(from, files, callback) {
    var self    = this,
        i       = files.length,
        fn      = function() {
            if (!--i)
                callback();
        };
    
    files.forEach(function(name) {
        var full = path.join(from, name);
        
        self._findFiles(full, fn);
    });
};

Jaguar.prototype._findFiles = function(filename, fn) {
    var self        = this,
        
        finder      = findit(filename),
        
        inc         = function() {
            ++self._n;
        };
    
    finder.on('file', inc);
    finder.on('error', function(error) {
        self.emit('error', error);
        self.abort();
    });
    
    finder.on('directory', inc);
    finder.on('link', inc);
    
    finder.on('end', function() {
        fn();
    });
};

Jaguar.prototype._pack = function() {
    const from = this._from;
    const to = this._to;
    const streamFile  = typeof to === 'object' ?
        to : fs.createWriteStream(to);
        
    const zipfile = new yazl.ZipFile();
    this._names.forEach((name) => {
        zipfile.addFile(name, name);
        this._progress();
        this.emit('file', name);
    });
    
    zipfile.end();
    
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
};

Jaguar.prototype._parse = function(fn) {
    const from = this._from;
    const to = this._to;
    
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
}

Jaguar.prototype._extract  = function() {
    const from = this._from;
    const to = this._to;
    
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

Jaguar.prototype._writeFile = function(fileName, readStream, fn) {
    mkdirp(path.dirname(fileName), (error) => {
        if (error)
            return fn(error);
        
        const writeStream = fs.createWriteStream(fileName);
        
        pipe([readStream, writeStream], fn);
    });
};

Jaguar.prototype._progress  = function() {
    var value;
    
    ++this._i;
    
    value = Math.round(this._i * 100 / this._n);
    
    this._percent = value;
    
    if (value !== this._percentPrev) {
        this._percentPrev = value;
        this.emit('progress', value);
    }
};

