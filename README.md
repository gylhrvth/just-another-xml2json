# Just another XML 2 json (and vica verasa) converter

This is a simple to use tool to parse and create XML files. It was written in 100% typescript.

## Installation
```sh
npm install just-another-xml2json
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
{
  a: [
    { '@myAttr': '123' },
    { b: [ { '@bAttr': 'Hello' } ] },
    { b: [ { '@bAttr': 'World!' }, { '#TEXT': '1234' } ] }
  ],
  '#PROC_INSTR': '<?xml version="1.0"?>'
}
```

The variable "ignoredTokens" contains the ignored tokens (e.g. comments)

## Usage JSON --> XML
```ts
const myObject = {
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
  '#PROC_INSTR': '<?xml version="1.0"?>'
}
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