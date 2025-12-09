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
  TOKEN_TYPE_TAG_NAME,
  TOKEN_TYPE_TEXT
} from './lexer.js';
import { deprecate } from 'util';


export class WrongFormattedXmlError extends Error {
  token?: Token

  constructor(message?: string, token?: Token) {
    super(message)
    this.name = 'WrongFormattedXmlError'
    this.token = token
  }
}


export async function readXMLFile(path: string) {
  const buffer = await fs.readFile(path);
  return convertXML2JSON(buffer.toString())
}

export async function writeXMLFile(path: string, obj: any) {
  const buffer = convertJSON2XML(obj)
  const buf = Buffer.from(buffer, 'utf8');
  await fs.writeFile(path, buf)
}


export function convertXML2JSON(xmlBuffer: string): any[] {
  const lex = new Lexer(xmlBuffer)

  let tagStack = []
  let tagNameStack = []
  let attributes: {}[] = []
  let attrNameStack = []
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
      let newObject = {}
      Object.assign(newObject, { ['#COMMENT']: token.value })
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

  if (tagStack.filter(t =>
    !Object.keys(t).includes('#COMMENT') &&
    !Object.keys(t).includes('#PROC_INSTR')
  ).length != 1) {
    throw new WrongFormattedXmlError('The root must have exactly ONE tag.')
  }
  return [tagStack, ignoredTokens]
}


export function convertJSON2XML(obj: any[]) {
  const parts: string[] = []

  obj.forEach(o => {
    console.log('Top-level object:', o)

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
    parts.push(`${value}\n`)
    return parts
  } else if (Array.isArray(value)) {
    value.forEach((element: any) => {
      const keys = Object.keys(element)
      if (keys.length == 1) {
        const key = keys[0]
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

