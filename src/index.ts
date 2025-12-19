import { promises as fs } from 'fs'
import {
  Lexer,
  Token,
  TOKEN_TYPE_ATTR_VALUE_DQ,
  TOKEN_TYPE_ATTR_VALUE_SQ,
  TOKEN_TYPE_CDATA,
  TOKEN_TYPE_COMMENT,
  TOKEN_TYPE_EQUAL,
  TOKEN_TYPE_GT,
  TOKEN_TYPE_LT,
  TOKEN_TYPE_PROC_INSTR,
  TOKEN_TYPE_SLASH,
  TOKEN_TYPE_SLASH_GT,
  TOKEN_TYPE_TAG_NAME,
  TOKEN_TYPE_TEXT
} from './lexer.js';


export type ConvertXML2JSONOptions = {
  dropArrayIfKeysAreUnique?: boolean
}

export class WrongFormattedXmlError extends Error {
  token?: Token

  constructor(message?: string, token?: Token) {
    super(message)
    this.name = 'WrongFormattedXmlError'
    this.token = token
  }
}


export async function readXMLFile(path: string, options: ConvertXML2JSONOptions = {}): Promise<[result: (any | any[]), ignoredTokens: Token[]]> {
  const buffer = await fs.readFile(path);
  return convertXML2JSON(buffer.toString(), options)
}

export async function writeXMLFile(path: string, obj: any): Promise<void> {
  const buffer = convertJSON2XML(obj)
  const buf = Buffer.from(buffer, 'utf8');
  await fs.writeFile(path, buf)
}


export function convertXML2JSON(xmlBuffer: string, options: ConvertXML2JSONOptions = {}): [result: (any | any[]), ignoredTokens: Token[]] {
  const lex = new Lexer(xmlBuffer)

  let tagStack: (object | object[])[] = []
  let tagNameStack: Token[] = []
  let attributes: {}[] = []
  let attrNameStack: Token[] = []
  const ignoredTokens: Token[] = []

  for (let token of lex.tokens()) {
    if (token.type === TOKEN_TYPE_LT ||
      token.type === TOKEN_TYPE_SLASH
    ) {
      tagNameStack.push(token)
    } else if (token.type === TOKEN_TYPE_TAG_NAME) {
      if (tagNameStack.length == 0 || tagNameStack[tagNameStack.length - 1].type !== 'TAG_NAME') {
        // Add tag
        tagNameStack.push(token)
      } else {
        // Add attribute
        attrNameStack.push(token)
      }
    } else if (token.type === TOKEN_TYPE_SLASH_GT) {
      const tagName = tagNameStack.filter(t => t.type === 'TAG_NAME')[0]
      if (!tagName ||
        !Object.keys(tagName).includes('value')
      ) {
        throw new WrongFormattedXmlError('Missing tag name', tagName)
      }
      let childElements = [...attributes]

      tagStack.push({ [tagName.value]: [] })
      const [[key, value]] = Object.entries(tagStack[tagStack.length - 1])
      mergeAsObjectOrArray(tagStack[tagStack.length - 1], key, value, childElements, options)

      tagNameStack = []
      attributes = []
    } else if (token.type === TOKEN_TYPE_GT) {
      const tagName = tagNameStack.filter(t => t.type === 'TAG_NAME')[0]
      const closingTag = (tagNameStack.length >= 2 && tagNameStack[1].type === 'SLASH')
      if (!tagName ||
        !Object.keys(tagName).includes('value')
      ) {
        throw new WrongFormattedXmlError('Missing tag name', tagName)
      }

      if (!closingTag) {
        let newObject = {}
        Object.assign(newObject, { [tagName.value]: [...attributes] })
        tagStack.push(newObject)
      } else {
        let childElements: any[] = []
        let index = tagStack.length - 1

        while (index > 0 && !Object.keys(tagStack[index]).includes(tagName.value)) {
          childElements = [tagStack[index], ...childElements]
          --index
          tagStack.pop()
        }
        if (index >= 0) {
          const [[key, value]] = Object.entries(tagStack[index])
          if (key !== undefined) {
            // validate matching opening-closing tag.
            if (key !== tagName.value) {
              throw new WrongFormattedXmlError(`Tag name of closing tag "${tagName.value}" at ${token.line}:${token.col} doesn't match to any opening tag.`)
            }
            for (let i = value.length - 1; i >= 0; --i) {
              const attrObj = value[i]
              childElements = [attrObj, ...childElements]
            }
            Object.assign(tagStack[index], { [key]: {} })
            mergeAsObjectOrArray(tagStack[index], key, value, childElements, options)
          }
        } else {
          console.error('Stack error')
        }
      }
      tagNameStack = []
      attributes = []
    } else if (token.type === TOKEN_TYPE_EQUAL) {
      attrNameStack.push(token)
    } else if (token.type === TOKEN_TYPE_ATTR_VALUE_DQ ||
      token.type === TOKEN_TYPE_ATTR_VALUE_SQ
    ) {
      const attrName = attrNameStack[0].value
      // drop string quotes
      const attrValue = token.value.slice(1, token.value.length - 1)
      attributes = [
        ...attributes,
        { [`@${attrName}`]: attrValue }
      ]
      attrNameStack = []
    } else if (token.type === TOKEN_TYPE_TEXT ||
      token.type === TOKEN_TYPE_CDATA
    ) {
      const textValue = token.value.trim()
      if (textValue.length != 0) {
        let newObject = {}
        Object.assign(newObject, { ['#TEXT']: textValue })
        tagStack.push(newObject)
      }
    } else if (token.type === TOKEN_TYPE_COMMENT) {
      let commentValue = token.value.trim()
      commentValue = commentValue.substring(4, commentValue.length - 3) // remove <!-- and -->
      let newObject = {}
      Object.assign(newObject, { ['#COMMENT']: commentValue })
      tagStack.push(newObject)
    } else if (token.type === TOKEN_TYPE_PROC_INSTR) {
      let newObject = {}
      Object.assign(newObject, { ['#PROC_INSTR']: token.value })
      tagStack.push(newObject)
    } else {
      // IGNORED token
      ignoredTokens.push(token)
    }
  }


  const rootTags = tagStack.filter(t =>
    !Object.keys(t).includes('#COMMENT') &&
    !Object.keys(t).includes('#PROC_INSTR')
  ).map((t: any) => {
    const key = Object.keys(t)[0]
    if (key === "#TEXT") {
      return t[key]
    }
    return key
  })

  if (rootTags.length != 1) {
    throw new WrongFormattedXmlError(`The root must have exactly ONE tag. Check for "${rootTags.join(', ')}" tags.`)
  }
  if (options.dropArrayIfKeysAreUnique === true && isEveryKeyUnique(tagStack)) {
    let resultObject: object = {} as object
    tagStack.forEach((t: any) => {
      const key = Object.keys(t)[0]
      Object.assign(resultObject, { [key]: t[key] })
    })
    return [resultObject, ignoredTokens]
  }
  return [tagStack, ignoredTokens]
}


export function convertJSON2XML(obj: any | any[]): string {
  const parts: string[] = []

  if (!Array.isArray(obj)) {
    obj = [obj]
  }
  obj.forEach((o: any) => {
    Object.keys(o).forEach(tag => {
      createTag(tag, o[tag]).forEach(p => parts.push(p))
    })
  })


  const result = parts.join('')
  return result;
}


function createTag(tagName: string, value: any, indent: number = 0): string[] {
  const indentString = (indent == 0 ? '' : '    ')
  const parts: string[] = []
  const attributes: string[] = []
  const children: string[] = []
  const texts: string[] = []

  if (tagName === '#PROC_INSTR') {
    parts.push(`${value}\n`)
    return parts
  } else if (tagName === '#COMMENT') {
    parts.push(`<!--${value}-->\n`)
    return parts
  } else if (Array.isArray(value)) {
    value.forEach((element: any) => {
      // Process values as array 
      const keys = Object.keys(element)
      if (keys.length == 1) {
        const key = keys[0]
        processChildElements(key, element, indent, attributes, children, texts)
      } else {
        console.error('Invalid Keys', element)
      }
    })
  } else {
    // Process object attributes as children...
    Object.keys(value).forEach(key => {
      processChildElements(key, value, indent, attributes, children, texts)
    })
  }

  if (children.length == 0) {
    // Create single line XML tag
    if (texts.length == 0) {
      parts.push(`${indentString}<${tagName}${attributes.join('')}/>\n`)
    } else {
      parts.push(`${indentString}<${tagName}${attributes.join('')}>${texts.join(' ')}</${tagName}>\n`)
    }
  } else {
    parts.push(`${indentString}<${tagName}${attributes.join('')}>\n`)
    texts.forEach(c => parts.push(`${indentString}${c}\n`))
    children.forEach(c => parts.push(`${indentString}${c}`))
    parts.push(`${indentString}</${tagName}>\n`)
  }
  return parts
}


function processChildElements(key: string, element: any, indent: number, attributes: string[], children: string[], texts: string[]) {
  if (key === '#COMMENT') {
    children.push(`    ${element[key]}\n`)
  } else if (key === '#TEXT') {
    texts.push(element[key])
  } else if (key.startsWith('@')) {
    const attributeName = key.slice(1)
    attributes.push(` ${attributeName}="${element[key].toString()}"`)
  } else {
    createTag(key, element[key], indent + 1).forEach(c => children.push(c))
  }
}


function mergeAsObjectOrArray(tagStackTopObject: object | object[], key: string, value: object, childElements: object[], options: ConvertXML2JSONOptions) {
  if (options.dropArrayIfKeysAreUnique !== true) {
    Object.assign(tagStackTopObject, { [key]: [...childElements] })
  } else {
    if (isEveryKeyUnique(childElements)) {
      let compactChildElements = {}
      childElements.forEach((ce: any) => {
        const ceKey = Object.keys(ce)[0]
        Object.assign(compactChildElements, { [ceKey]: ce[ceKey] })
      })
      Object.assign(tagStackTopObject, { [key]: { ...compactChildElements } })
    } else {
      Object.assign(tagStackTopObject, { [key]: [...childElements] })
    }
  }
}


function isEveryKeyUnique(objArray: object[]): boolean {
  const countDuplicates: Map<string, number> = objArray.reduce((result: Map<string, number>, ce) => {
    const key = Object.keys(ce)[0]
    result.set(key, (result.get(key) || 0) + 1)
    return result
  }, new Map<string, number>())

  return Array.from(countDuplicates.entries()).every(kv => kv[1] === 1);
}


