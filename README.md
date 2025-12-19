# Just another XML 2 json (and vica verasa) converter

This is a simple to use tool to parse and create XML files. It was written in 100% typescript.

## Installation
```sh
npm install just-another-xml2json
```

## What's new?

### Handling Comments
The comment tag was not cleared from XML comment prefix and suffix. It has been corrected

### webpack users
Some webpack users has reported a problem with importing the library.
For them there are a new export:

```ts
const { convertXML2JSON } = require('just-another-xml2json/cjs')
```

### dropArrayIfKeysAreUnique Option

In some cases, you may use a well defined XML file and don't like all these arrays with a single element.
To generate a compact result, you may use the options, like:
```ts
const [result, ignoredTokens] = convertXML2JSON(xmlFileContent, { dropArrayIfKeysAreUnique: true })
```

## Usage XML -> JSON
```ts
const xmlFileContent = '<?xml version="1.0"?>\
<a myAttr="123">\
    <b bAttr="Hello"/>\
    <b bAttr="World!">1234</b>\
</a>'
const [result, ignoredTokens] = convertXML2JSON(xmlFileContent)
````

The variable "result" conains the parsed data:
```
[
{
  '#PROC_INSTR': '<?xml version="1.0"?>'
},
{
  a: [
    { '@myAttr': '123' },
    { b: [ { '@bAttr': 'Hello' } ] },
    { b: [ { '@bAttr': 'World!' }, { '#TEXT': '1234' } ] }
  ],
}
]
```

The variable "ignoredTokens" contains the ignored tokens

## Usage JSON --> XML
```ts
const myObject = [
  {
    '#PROC_INSTR': '<?xml version="1.0"?>'
  },
  {
  a: [
    { '@myAttr': '123' },
    {
      'b': [
        { '@bAttr': 'Hello' }
      ]
    },
    {
      'b': [
        { '@bAttr': 'World!' },
        { '#TEXT': '1234' }
      ]
    },
  ],
}]
const result: string = convertJSON2XML(myObject)
```

The variable result contains the XML representation of the input data:
```xml
<?xml version="1.0"?>
<a myAttr="123">
    <b bAttr="Hello"/>
    <b bAttr="World!">1234</b>
</a>
```

### Working with files directly
```ts
  const testDataPath = '/home/userX/...'  // location of input XML
  const testOutPath = '/home/userX/...'   // location of result XML

  const [result] = await readXMLFile(testDataPath)
  await writeXMLFile(testOutPath, result)
```

## API
K.I.S.S = keep it simple and...

```ts
type ConvertXML2JSONOptions = {
    dropArrayIfKeysAreUnique?: boolean;
};
class WrongFormattedXmlError extends Error {
    token?: Token;
    constructor(message?: string, token?: Token);
}

function convertXML2JSON(xmlBuffer: string, options?: ConvertXML2JSONOptions): [result: (any | any[]), ignoredTokens: Token[]];
function convertJSON2XML(obj: any | any[]): string;

async function readXMLFile(path: string, options?: ConvertXML2JSONOptions): Promise<[result: (any | any[]), ignoredTokens: Token[]]>;
async function writeXMLFile(path: string, obj: any): Promise<void>;
```

## Licensing
MIT License

Copyright (c) 2025 gylhrvth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing
Hello, thank you for your interest in helping!

Please feel free to ask any questions via a [new issue](https://github.com/gylhrvth/just-another-xml2json/issues).

### Submit a new bug report
Please create a [new issue](https://github.com/gylhrvth/just-another-xml2json/issues) containing the steps to reproduce the problem.

### Submit a new feature request
Please describe the user story in a [new issue](https://github.com/gylhrvth/just-another-xml2json/issues) including sample inputs.