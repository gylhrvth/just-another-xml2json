import { convertXML2JSON, convertJSON2XML, readXMLFile, writeXMLFile, WrongFormattedXmlError } from './index.js'
import path from 'path';
import * as fs from 'fs'

describe('convert XML to JSON', () => {
    test('Minimum XML', () => {
        const input = '<a/>'
        const [result] = convertXML2JSON(input)

        expect(result).toStrictEqual([{
            a: []
        }])
    })

    test('XML decoration', () => {
        const input = '<?xml version="1.0"?>\n<a/>'
        const [result] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a).toEqual([])
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
    })

    test('XML attributes', () => {
        const input = '<?xml version="1.0"?>\n<a myAttr="123"/>'
        const [result] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a).toEqual([{ "@myAttr": "123" }])
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
    })

    test('XML no child notes', () => {
        const input = '<?xml version="1.0"?>\n<a></a>'
        const [result] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a).toEqual([])
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
    })


    test('XML with a single child note', () => {
        const input = '<?xml version="1.0"?>\n<a><b/></a>'
        const [result] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a).toEqual([{ b: [] }])
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
    })


    test('XML with 5 child notes', () => {
        const input = '<?xml version="1.0"?>\n<a><b/><b/><b/><b/><b/></a>'
        const [result] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a).toEqual([
            { b: [] },
            { b: [] },
            { b: [] },
            { b: [] },
            { b: [] },
        ])
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
    })


    test('XML with TEXT notes', () => {
        const input = '<?xml version="1.0"?>\n<a>Dummy text</a>'
        const [result] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a).toEqual([
            { '#TEXT': 'Dummy text' },
        ])
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
    })

    test('XML with comment', () => {
        const input = '<?xml version="1.0"?>\n<a><!-- This is a comment --></a>'
        const [result, ignoredTokens] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a.length).toBe(1);
        expect(resultArray[1].a[0]).toHaveProperty('#COMMENT')
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
        expect(ignoredTokens.length).toEqual(0)
    })


    test('XML with CDATA', () => {
        const input = '<?xml version="1.0"?>\n<a><description><![CDATA[\
    This description contains characters that would normally need escaping:\
    <, >, &, and quotes (").\
    CDATA is useful for embedding text or code that should not be parsed as XML.\
  ]]></description></a>'
        const [result, ignoredTokens] = convertXML2JSON(input)

        expect(Array.isArray(result)).toBe(true)
        const resultArray = result as any[]
        expect(resultArray.length).toBe(2)
        expect(resultArray[1]).toHaveProperty('a')
        expect(resultArray[1].a.length).toBe(1)
        expect(resultArray[1].a[0]).toHaveProperty('description')
        expect((resultArray[1].a[0].description[0]['#TEXT'] as string).startsWith('<![CDATA[')).toEqual(true)
        expect(resultArray[0]).toHaveProperty('#PROC_INSTR')
        expect(ignoredTokens.length).toEqual(0)
    })


    test('Convert with and without options', () => {
        const input = '<?xml version="1.0"?>\n<a><b/></a>'
        const [result] = convertXML2JSON(input)
        const [resultWithOptions] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: false })

        expect(JSON.stringify(result)).toEqual(JSON.stringify(resultWithOptions))
    })

})



describe('convert XML to compact JSON (without arrays)', () => {
    test('Minimum XML', () => {
        const input = '<a/>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        expect(result).toStrictEqual({
            a: {}
        })
    })

    test('XML decoration', () => {
        const input = '<?xml version="1.0"?>\n<a/>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toEqual({})
        expect(resultObj).toHaveProperty('#PROC_INSTR')
    })

    test('XML attributes', () => {
        const input = '<?xml version="1.0"?>\n<a myAttr="123"/>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toEqual({ "@myAttr": "123" })
        expect(resultObj).toHaveProperty('#PROC_INSTR')
    })

    test('XML no child notes', () => {
        const input = '<?xml version="1.0"?>\n<a></a>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toEqual({})
        expect(resultObj).toHaveProperty('#PROC_INSTR')
    })


    test('XML with a single child note', () => {
        const input = '<?xml version="1.0"?>\n<a><b/></a>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toEqual({ b: {} })
        expect(resultObj).toHaveProperty('#PROC_INSTR')
    })


    test('XML with 5 child notes', () => {
        const input = '<?xml version="1.0"?>\n<a><b/><b/><b/><b/><b/></a>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toEqual([
            { b: {} },
            { b: {} },
            { b: {} },
            { b: {} },
            { b: {} },
        ])
        expect(resultObj).toHaveProperty('#PROC_INSTR')
    })


    test('XML with TEXT notes', () => {
        const input = '<?xml version="1.0"?>\n<a>Dummy text</a>'
        const [result] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toEqual(
            { '#TEXT': 'Dummy text' },
        )
        expect(resultObj).toHaveProperty('#PROC_INSTR')
    })

    test('XML with comment', () => {
        const input = '<?xml version="1.0"?>\n<a><!-- This is a comment --></a>'
        const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toHaveProperty('#COMMENT')
        expect(resultObj).toHaveProperty('#PROC_INSTR')
        expect(ignoredTokens.length).toEqual(0)
    })


    test('XML with CDATA', () => {
        const input = '<?xml version="1.0"?>\n<a><description><![CDATA[\
    This description contains characters that would normally need escaping:\
    <, >, &, and quotes (").\
    CDATA is useful for embedding text or code that should not be parsed as XML.\
  ]]></description></a>'
        const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })

        const resultObj = result as any
        expect(resultObj).toHaveProperty('a')
        expect(resultObj.a).toHaveProperty('description')
        expect((resultObj.a.description['#TEXT'] as string).startsWith('<![CDATA[')).toEqual(true)
        expect(resultObj).toHaveProperty('#PROC_INSTR')
        expect(ignoredTokens.length).toEqual(0)
    })

})



describe('convert JSON to XML', () => {
    test('Minimum JSON', () => {
        const input = [{
            a: []
        }]
        const result = convertJSON2XML(input)

        expect(result).toContain('<a/>')
    })


    test('XML decoration', () => {
        const input = [{
            a: [],
            '#PROC_INSTR': '<?xml version="1.0"?>'
        }]
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a/>')
    })


    test('JSON with attributes', () => {
        const input = [
            {
                '#PROC_INSTR': '<?xml version="1.0"?>'
            }, {
                a: [
                    { '@myAttr': '123' }
                ],
            }]
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123"/>')
    })

    test('JSON with TEXT node', () => {
        const input = [
            {
                '#PROC_INSTR': '<?xml version="1.0"?>'
            },
            {
                a: [
                    { '@myAttr': '123' },
                    { '#TEXT': 'abcd' }
                ],
            }]
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123">abcd</a>')
    })


    test('JSON with comment elements', () => {
        const input = [
            {
                '#PROC_INSTR': '<?xml version="1.0"?>'
            },
            {
                '#COMMENT': '<!-- This is a comment -->'
            },
            {
                a: [
                    { '@myAttr': '123' },
                    { 'b': [] }
                ]
            },
        ]
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<!-- This is a comment -->')
        expect(result).toContain('<a myAttr="123">')
        expect(result).toContain('<b/>')
        expect(result).toContain('</a>')
    })

    test('JSON with child elements', () => {
        const input = [{
            a: [
                { '@myAttr': '123' },
                { 'b': [] }
            ],
            '#PROC_INSTR': '<?xml version="1.0"?>'
        }]
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123">')
        expect(result).toContain('<b/>')
        expect(result).toContain('</a>')
    })


    test('Convert XML from a compact JSON', () => {
        const input = {
            '#PROC_INSTR': '<?xml version="1.0"?>',
            a: {
                '@myAttr': '123',
                b: {}
            },
        }
        const result: any = convertJSON2XML(input)
        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123">')
        expect(result).toContain('<b/>')
        expect(result).toContain('</a>')
    })
})


describe('convert XML to JSON and back', () => {
    test('test with XML comments', async () => {

        const testFileName = 'test3.xml'
        const testData = path.join(__dirname, '..', 'test_input', testFileName)
        const outDir = path.join(__dirname, '..', 'test_output')
        const testOut = path.join(outDir, testFileName)

        fs.mkdir(outDir, { recursive: true }, () => { })
        fs.rm(testOut, () => { })

        try {
            const stat = await fs.promises.stat(testOut);
        } catch (err: any) {
            // If file doesn't exist, stat() throws with code 'ENOENT'
            expect(err && err.code).toBe('ENOENT');
        }

        const [result] = await readXMLFile(testData)
        await writeXMLFile(testOut, result)

        try {
            const stat = await fs.promises.stat(testOut);
            expect(stat.size).toBeGreaterThan(0)
        } catch (err: any) {
            // If file doesn't exist, stat() throws with code 'ENOENT'
        }


    })


    test('stress test with an XSD', async () => {

        const testFileName = 'test2.xsd'
        const testData = path.join(__dirname, '..', 'test_input', testFileName)
        const outDir = path.join(__dirname, '..', 'test_output')
        const testOut = path.join(outDir, testFileName)

        fs.mkdir(outDir, { recursive: true }, () => { })
        fs.rm(testOut, () => { })

        try {
            const stat = await fs.promises.stat(testOut);
        } catch (err: any) {
            // If file doesn't exist, stat() throws with code 'ENOENT'
            expect(err && err.code).toBe('ENOENT');
        }

        const [result] = await readXMLFile(testData)
        await writeXMLFile(testOut, result)

        try {
            const stat = await fs.promises.stat(testOut);
            expect(stat.size).toBeGreaterThan(0)
        } catch (err: any) {
            // If file doesn't exist, stat() throws with code 'ENOENT'
        }
    })



    test('stress test with a large file', async () => {

        const testFileName = 'large.xml'
        const testData = path.join(__dirname, '..', 'test_input', testFileName)
        const outDir = path.join(__dirname, '..', 'test_output')
        const testOut = path.join(outDir, testFileName)

        fs.mkdir(outDir, { recursive: true }, () => { })
        fs.rm(testOut, () => { })

        try {
            const _stat = await fs.promises.stat(testOut);
        } catch (err: any) {
            // If file doesn't exist, stat() throws with code 'ENOENT'
            expect(err && err.code).toBe('ENOENT');
        }

        const startTime = performance.now();
        const [result] = await readXMLFile(testData)
        const midTime = performance.now();
        await writeXMLFile(testOut, result)
        const endTime = performance.now();

        const durationOfRead = midTime - startTime
        const durationOfWrite = endTime - midTime

        console.log(`Duration read: ${durationOfRead.toFixed(3)} ms. write: ${durationOfWrite.toFixed(3)} ms.`)

        try {
            const stat = await fs.promises.stat(testOut);
            expect(stat.size).toBeGreaterThan(1000000)
        } catch (err: any) {
            // If file doesn't exist, stat() throws with code 'ENOENT'
        }
        expect(durationOfRead).toBeLessThan(10000)
        expect(durationOfWrite).toBeLessThan(10000)

    })

})



describe('Wrong formated XML documents', () => {
    test('Missing opening <', () => {
        const input = '<a>b/></a>'
        const [result] = convertXML2JSON(input)

        expect(result).toStrictEqual([{
            a: [
                { '#TEXT': 'b/>' }
            ]
        }])
    })

    test('Missing tag name', () => {
        const input = '<a><>ABCD</b></a>'
        expect(() => convertXML2JSON(input)).toThrow(WrongFormattedXmlError);
    })

    test('Missing tag name at the closing tag', () => {
        const input = '<a><b>ABCD</></a>'
        expect(() => convertXML2JSON(input)).toThrow(WrongFormattedXmlError);
    })

    test('Misplaced opening-cloging tags', () => {
        const input = '<a><b>ABCD</a></b>'
        expect(() => convertXML2JSON(input)).toThrow(WrongFormattedXmlError);
    })


    test('Two roots', () => {
        const input = '<a></a><b>ABCD</b>'
        expect(() => convertXML2JSON(input)).toThrow(WrongFormattedXmlError);
    })


    test('Incorrect XML file - only closing tags', () => {
        const input = '<?xml version="1.0"?>\n</a></description></description></a>'

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(WrongFormattedXmlError)
        }
    })

    test('Incorrect XML file - attribute without value', () => {
        const input = '<?xml version="1.0"?>\n<a><description name=></description></a>'

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(WrongFormattedXmlError)
        }
    })


    test('Incorrect XML file - missing closing sign', () => {
        const input = '<?xml version="1.0"?>\n<a><description name="example"</description></a>'

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(SyntaxError)
        }
    })

    test('Incorrect XML file - missing opening sign', () => {
        const input = '<?xml version="1.0"?>\n<a><description name="example">/description></a>'

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(WrongFormattedXmlError)
        }
    })


    test('Incorrect XML file - empty input', () => {
        const input = ''

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(WrongFormattedXmlError)
        }
    })


    test('Incorrect XML file - only whitespaces', () => {
        const input = '   \n   \t   '

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(WrongFormattedXmlError)
        }
    })

    test('Incorrect XML file - abcdefgh', () => {
        const input = 'abcdefgh'

        try {
            const [result, ignoredTokens] = convertXML2JSON(input, { dropArrayIfKeysAreUnique: true })
        } catch (e) {
            expect(e).toBeInstanceOf(WrongFormattedXmlError)
        }
    })


})