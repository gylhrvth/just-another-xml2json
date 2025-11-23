import { convertXML2JSON, convertJSON2XML, readFile, writeFile, WrongFormattedXmlError } from './index'
import path from 'path';
import * as fs from 'fs'

describe('convert XML to JSON', () => {
    test('Minimum XML', () => {
        const input = '<a/>'
        const [result] = convertXML2JSON(input)

        expect(result).toStrictEqual({
            a: []
        })
    })

    test('XML decoration', () => {
        const input = '<?xml version="1.0"?>\n<a/>'
        const [result] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([])
        expect(result).toHaveProperty('#PROC_INSTR')
    })

    test('XML attributes', () => {
        const input = '<?xml version="1.0"?>\n<a myAttr="123"/>'
        const [result] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([{ "@myAttr": "123" }])
        expect(result).toHaveProperty('#PROC_INSTR')
    })

    test('XML no child notes', () => {
        const input = '<?xml version="1.0"?>\n<a></a>'
        const [result] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([])
        expect(result).toHaveProperty('#PROC_INSTR')
    })


    test('XML with a single child note', () => {
        const input = '<?xml version="1.0"?>\n<a><b/></a>'
        const [result] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([{ b: [] }])
        expect(result).toHaveProperty('#PROC_INSTR')
    })


    test('XML with 5 child notes', () => {
        const input = '<?xml version="1.0"?>\n<a><b/><b/><b/><b/><b/></a>'
        const [result] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([
            { b: [] },
            { b: [] },
            { b: [] },
            { b: [] },
            { b: [] },
        ])
        expect(result).toHaveProperty('#PROC_INSTR')
    })


    test('XML with TEXT notes', () => {
        const input = '<?xml version="1.0"?>\n<a>Dummy text</a>'
        const [result] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([
            { '#TEXT': 'Dummy text' },
        ])
        expect(result).toHaveProperty('#PROC_INSTR')
    })

    test('XML with comment', () => {
        const input = '<?xml version="1.0"?>\n<a><!-- This is a comment --></a>'
        const [result, ignoredTokens] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a).toEqual([])
        expect(result).toHaveProperty('#PROC_INSTR')
        expect(ignoredTokens.length).toEqual(1)
    })


    test('XML with CDATA', () => {
        const input = '<?xml version="1.0"?>\n<a><description><![CDATA[\
    This description contains characters that would normally need escaping:\
    <, >, &, and quotes (").\
    CDATA is useful for embedding text or code that should not be parsed as XML.\
  ]]></description></a>'
        const [result, ignoredTokens] = convertXML2JSON(input)

        expect(result).toHaveProperty('a')
        expect(result.a[0]).toHaveProperty('description')
        expect((result.a[0].description[0]['#TEXT'] as string).startsWith('<![CDATA[')).toEqual(true)
        expect(result).toHaveProperty('#PROC_INSTR')
        expect(ignoredTokens.length).toEqual(0)
    })

})



describe('convert JSON to XML', () => {
    test('Minimum JSON', () => {
        const input = {
            a: []
        }
        const result = convertJSON2XML(input)

        expect(result).toContain('<a/>')
    })


    test('XML decoration', () => {
        const input = {
            a: [],
            '#PROC_INSTR': '<?xml version="1.0"?>'
        }
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a/>')
    })


    test('JSON with attributes', () => {
        const input = {
            a: [
                { '@myAttr': '123' }
            ],
            '#PROC_INSTR': '<?xml version="1.0"?>'
        }
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123"/>')
    })

    test('JSON with TEXT node', () => {
        const input = {
            a: [
                { '@myAttr': '123' },
                { '#TEXT': 'abcd' }
            ],
            '#PROC_INSTR': '<?xml version="1.0"?>'
        }
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123">abcd</a>')
    })


    test('JSON with child elements', () => {
        const input = {
            a: [
                { '@myAttr': '123' },
                { 'b': [] }
            ],
            '#PROC_INSTR': '<?xml version="1.0"?>'
        }
        const result: any = convertJSON2XML(input)

        expect(result).toContain('<?xml version="1.0"?>')
        expect(result).toContain('<a myAttr="123">')
        expect(result).toContain('<b/>')
        expect(result).toContain('</a>')
    })


})


describe('convert XML to JSON and back', () => {
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

        const result = await readFile(testData)
        await writeFile(testOut, result)

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
        const result = await readFile(testData)
        const midTime = performance.now();
        await writeFile(testOut, result)
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

        expect(result).toStrictEqual({
            a: [
                { '#TEXT': 'b/>' }
            ]
        })
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


})