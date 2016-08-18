# OneZip [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Pack and extract .zip archives with emitter. For work with `.tar.gz` archives use [jaguar](https://github.com/coderaiser/node-jaguar "Jaguar").

## Global

`onezip` could be installed global with

```
npm i onezip -g
```
And used this way:

```
Usage: onezip [filename]
Options:
  -h, --help      display this help and exit
  -v, --version   output version information and exit
  -p, --pack      pack files to archive
  -x, --extract   extract files from archive
```

## Local

`onezip` could be used localy. It will emit event on every packed/extracted file.
Good for making progress bars.

## Install

```
npm i onezip --save
```

## Environments

In old `node.js` environments that supports `es5` only, `redrun` could be used with:

```js
var redrun = require('redrun/legacy');
```

## How to use?

### pack(from, to, names)

- `from`  - **string** directory that would be packed
- `to`    - **string** or **stream**, name of archive
- `names` - **array** of names in directory `from` that would be packed.

```js
var pack,
    onezip          = require('onezip'),
    path            = require('path'),
    cwd             = process.cwd(),
    name            = 'pipe.tar.gz',
    from            = cwd + '/pipe-io',
    to              = path.join(cwd, name);
    
pack = onezip.pack(from, to, [
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

- `from` - path to **.zip** archive
- `to` - path to directory where files would be stored.

```js
const onezip = require('onezip');
const path = require('path');
const cwd = process.cwd();
const name = 'pipe.zip';
const to = cwd + '/pipe-io';
const from = path.join(cwd, name);

const extract = onezip.extract(from, to);

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

[NPMIMGURL]:                https://img.shields.io/npm/v/onezip.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-onezip/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/node-onezip.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/onezip "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-onezip  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/node-onezip "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

