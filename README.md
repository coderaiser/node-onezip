# OneZip [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Pack and extract .zip archives with emitter.

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

## How to use?

### pack(from, to, names)

- `from`  - **string** directory that would be packed
- `to`    - **string** or **stream**, name of archive
- `names` - **array** of names in directory `from` that would be packed.

```js
const onezip = require('onezip');
const path = require('path');
const cwd = process.cwd();
const name = 'pipe.tar.gz';
const from = cwd + '/pipe-io';
const to = path.join(cwd, name);

const pack = onezip.pack(from, to, [
    'LICENSE',
    'README.md',
    'package.json'
]);

pack.on('file', (name) => {
    console.log(name);
});

pack.on('start', () => {
    console.log('start packing');
});

pack.on('progress', (percent) => {
    console.log(percent + '%');
});

pack.on('error', (error) => {
    console.error(error);
});

pack.on('end', () => {
    console.log('done');
});
```

### extract(from, to)

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

extract.on('file', (name) => {
    console.log(name);
});

extract.on('start', (percent) => {
    console.log('extracting started');
});

extract.on('progress', (percent) => {
    console.log(percent + '%');
});

extract.on('error', (error) => {
    console.error(error);
});

extract.on('end', () => {
    console.log('done');
});
```

In case of starting example output should be similar to (but with additional events):

```
33%
67%
100%
done
```

## Related

- [Jag](https://github.com/coderaiser/node-jag "Jag") - Pack files and folders with tar and gzip.
- [Jaguar](https://github.com/coderaiser/node-jaguar "Jaguar") - Pack and extract .tar.gz archives with emitter.
- [Tar-to-zip](https://github.com/coderaiser/node-tar-to-zip "Tar-to-zip") - Convert tar and tar.gz archives to zip.

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/onezip.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-onezip/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/david/coderaiser/node-onezip.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/onezip "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-onezip  "Build Status"
[DependencyStatusURL]:      https://david-dm.org/coderaiser/node-onezip "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

[CoverageURL]:              https://coveralls.io/github/coderaiser/node-onezip?branch=master
[CoverageIMGURL]:           https://coveralls.io/repos/coderaiser/node-onezip/badge.svg?branch=master&service=github

