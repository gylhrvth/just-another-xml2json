import { promises as fs } from 'fs'
import { Lexer, Token } from './lexer.js';

export class WrongFormattedXmlError extends Error {
  token?: Token

  constructor(message?: string, token?: Token) {
    super(message)
    this.name = 'WrongFormattedXmlError'
    this.token = token
  }
}


export async function readFile(path: string) {
  const buffer = await fs.readFile(path);
  return convertXML2JSON(buffer.toString())
}

export async function writeFile(path: string, obj: any) {
  const buffer = convertJSON2XML(obj)
  const buf = Buffer.from(buffer, 'utf8');
  await fs.writeFile(path, buf)
}


export function convertXML2JSON(xmlBuffer: string): any {
  const lex = new Lexer(xmlBuffer)

  let tagStack = []
  let tagNameStack = []
  let attributes: {}[] = []
  let attrNameStack = []
  const ignoredTokens: Token[] = []
  let proc_instr = ""

  for (let token of lex.tokens()) {
    if (token.type === 'LT' ||
      token.type === 'SLASH'
    ) {
      tagNameStack.push(token)
    } else if (token.type === 'TAG_NAME') {
      if (tagNameStack.length == 0 || tagNameStack[tagNameStack.length - 1].type !== 'TAG_NAME') {
        // Add tag
        tagNameStack.push(token)
      } else {
        // Add attribute
        attrNameStack.push(token)
      }
    } else if (token.type === 'GT') {
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
              throw new WrongFormattedXmlError(`Tag name of closing tag "${key}" doesn't match to "${tagName.value}"`, tagName)
            }
            Object.assign(tagStack[index], { [key]: [...value as [], ...childElements] })
          }
        } else {
          console.error('Stack error')
        }
      }
      tagNameStack = []
      attributes = []
    } else if (token.type === 'EQUAL') {
      attrNameStack.push(token)
    } else if (token.type === 'ATTR_VALUE_DQ') {
      const attrName = attrNameStack[0].value
      // drop string quotes
      const attrValue = token.value.slice(1, token.value.length - 1)
      attributes = [
        ...attributes,
        { [`@${attrName}`]: attrValue }
      ]
      attrNameStack = []
    } else if (token.type === 'TEXT' ||
      token.type === 'CDATA'
    ) {
      const textValue = token.value.trim()
      if (textValue.length != 0) {
        let newObject = {}
        const key = '#TEXT'
        Object.assign(newObject, { [key]: textValue })
        tagStack.push(newObject)
      }
    } else if (token.type === 'PROC_INSTR') {
      proc_instr = token.value
    } else {
      // IGNORED token
      ignoredTokens.push(token)
    }
  }
  if (proc_instr !== '') {
    Object.assign(tagStack[0], { '#PROC_INSTR': proc_instr })
  }
  if (tagStack.length != 1) {
    throw new WrongFormattedXmlError('The root must have exactly ONE tag.')
  }
  return [tagStack[0], ignoredTokens]
}


export function convertJSON2XML(obj: any) {
  const parts: string[] = []
  if (Object.keys(obj).includes('#PROC_INSTR')) {
    parts.push(`${obj['#PROC_INSTR']}\n`)
  }

  Object.keys(obj).forEach(tag => {
    createTag(tag, obj[tag]).forEach(p => parts.push(p))
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
    return parts;
  }
  if (Array.isArray(value)) {
    value.forEach((element: any) => {
      const keys = Object.keys(element)
      if (keys.length == 1) {
        const key = keys[0]
        if (key === '#TEXT') {
          texts.push(element[key])
        } else if (key.startsWith('@')) {
          const attributeName = key.slice(1)
          attributes.push(` ${attributeName}="${element[key].toString()}"`)
        } else {
          createTag(key, element[key], indent + 1).forEach(c => children.push(c))
        }
      } else {
        console.error('Invalid Keys', element)
      }
    })
  } else {
    console.error('Invalid tag', value)
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

