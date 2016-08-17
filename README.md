# Jaguar [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Pack and extract .tar.gz archives with emitter. 

## Global

`Jaguar` could be installed global with

```
npm i jaguar -g
```
And used this way:

```
Usage: jaguar [filename]
Options:
  -h, --help      display this help and exit
  -v, --version   output version information and exit
  -p, --pack      pack files to archive
  -x, --extract   extract files from archive
```

## Local

`Jaguar` could be used localy. It will emit event on every packed/extracted file.
Good for making progress bars.

### Install

```
npm i jaguar --save
```

### How to use?

#### pack(from, to, names)

- `from`  - **string** directory that would be packed
- `to`    - **string** or **stream**, name of archive
- `names` - **array** of names in directory `from` that would be packed.

```js
var pack,
    jaguar          = require('jaguar'),
    path            = require('path'),
    cwd             = process.cwd(),
    name            = 'pipe.tar.gz',
    from            = cwd + '/pipe-io',
    to              = path.join(cwd, name);
    
pack = jaguar.pack(from, to, [
    'LICENSE',
    'README.md',
    'package.json'
]);

pack.on('file', function(name) {
    console.log(name);
});

pack.on('progress', function(percent) {
    console.log(percent + '%');
});

pack.on('error', function(error) {
    console.error(error);
});

pack.on('end', function() {
    console.log('done');
});
```

#### extract(from, to)

- `from` - path to **.tar.gz** archive
- `to` - path to directory where files would be stored.

```js
var extract,
    jaguar          = require('jaguar'),
    path            = require('path'),
    cwd             = process.cwd(),
    name            = 'pipe.tar.gz',
    to              = cwd + '/pipe-io',
    from            = path.join(cwd, name);
    
extract = jaguar.extract(from, to);

extract.on('file', function(name) {
    console.log(name);
});

extract.on('progress', function(percent) {
    console.log(percent + '%');
});

extract.on('error', function(error) {
    console.error(error);
});

extract.on('end', function() {
    console.log('done');
});
```


In case of starting example output should be similar to:

```
33%
67%
100%
done
```

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/jaguar.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-jaguar/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/node-jaguar.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/jaguar "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-jaguar  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/node-jaguar "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

