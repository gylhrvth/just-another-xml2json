export const TOKEN_TYPE_PROC_INSTR = "PROC_INSTR"
export const TOKEN_TYPE_COMMENT = "COMMENT"
export const TOKEN_TYPE_CDATA = "CDATA"
export const TOKEN_TYPE_DOCTYPE = "DOCTYPE"
export const TOKEN_TYPE_LT = "LT"
export const TOKEN_TYPE_ENTITY = "ENTITY"
export const TOKEN_TYPE_TEXT = "TEXT"
export const TOKEN_TYPE_WHITESPACE = "WHITESPACE"
export const TOKEN_TYPE_SLASH = "SLASH"
export const TOKEN_TYPE_TAG_NAME = "TAG_NAME"
export const TOKEN_TYPE_ATTR_NAME = "ATTR_NAME"
export const TOKEN_TYPE_EQUAL = "EQUAL"
export const TOKEN_TYPE_ATTR_VALUE_DQ = "ATTR_VALUE_DQ"
export const TOKEN_TYPE_ATTR_VALUE_SQ = "ATTR_VALUE_SQ"
export const TOKEN_TYPE_SLASH_GT = "SLASH_GT"
export const TOKEN_TYPE_GT = "GT"
export const TOKEN_TYPE_PUNCT = "PUNCT"


export type TokenType = string;
export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;   // exclusive
    line: number;  // 1-based
    col: number;   // 1-based
}

type Rule = {
    type: TokenType;
    regex: RegExp;     // should match at start /^.../
    ignore?: boolean;  // skip token (true => do not return)
};

type StateName = "DATA" | "TAG";

export class Lexer {
    private input: string;
    private pos = 0;
    private line = 1;
    private col = 1;
    private state: StateName = "DATA";

    // rules for the two states: DATA (outside tags) and TAG (inside <...>)
    private dataRules: Rule[] = [
        // processing instructions / XML declaration (<? ... ?>)
        { type: TOKEN_TYPE_PROC_INSTR, regex: /^<\?[\s\S]*?\?>/ },

        // comments
        { type: TOKEN_TYPE_COMMENT, regex: /^<!--[\s\S]*?-->/ },

        // CDATA sections
        { type: TOKEN_TYPE_CDATA, regex: /^<!\[CDATA\[[\s\S]*?\]\]>/ },

        // DOCTYPE (simple, not fully robust for nested bracketed subsets)
        { type: TOKEN_TYPE_DOCTYPE, regex: /^<!DOCTYPE[\s\S]*?>/i },

        // an opening angle bracket starts tag mode; consume '<' as token then switch
        { type: TOKEN_TYPE_LT, regex: /^</ },

        // entity references (&name; or numeric)
        { type: TOKEN_TYPE_ENTITY, regex: /^&#?\w+;?/ },

        // text content until next '<' or '&' (note: preserves whitespace in text)
        { type: TOKEN_TYPE_TEXT, regex: /^[^<&]+/ },
    ];

    private tagRules: Rule[] = [
        // inside tags whitespace separates attributes -> ignore
        { type: TOKEN_TYPE_WHITESPACE, regex: /^\s+/, ignore: true },

        // tag name (first identifier you see in a tag)
        { type: TOKEN_TYPE_TAG_NAME, regex: /^[A-Za-z_:][\w:.-]*/ },

        // attribute name
        { type: TOKEN_TYPE_ATTR_NAME, regex: /^[A-Za-z_:][\w:.-]*/ },

        // equal sign between attr name and value
        { type: TOKEN_TYPE_EQUAL, regex: /^=/ },

        // attribute values: double-quoted or single-quoted (XML does not allow backslash escapes)
        { type: TOKEN_TYPE_ATTR_VALUE_DQ, regex: /^"(?:[^"]*)"/ },
        { type: TOKEN_TYPE_ATTR_VALUE_SQ, regex: /^'(?:[^']*)'/ },

        // end of tag; match '/>' first for self-closing
        { type: TOKEN_TYPE_SLASH_GT, regex: /^\/>/ },

        // slash for closing tag (handled as own token)
        { type: TOKEN_TYPE_SLASH, regex: /^\// },

        { type: TOKEN_TYPE_GT, regex: /^>/ },

        // fallback: any other single punctuator inside tag (rare for XML)
        { type: TOKEN_TYPE_PUNCT, regex: /^[=]/ },
    ];

    constructor(input = "") {
        this.input = input;
    }

    // primary method: returns next token or null at EOF
    nextToken(): Token | null {
        const src = this.input;
        const len = src.length;
        if (this.pos >= len) return null;

        const slice = src.slice(this.pos);
        const rules = this.state === "DATA" ? this.dataRules : this.tagRules;

        for (const rule of rules) {
            const m = rule.regex.exec(slice);
            if (!m) continue;
            const text = m[0];
            if (text.length === 0) {
                throw new Error(`Lexer rule for ${rule.type} matched empty string at pos ${this.pos}`);
            }

            const tokenStart = this.pos;
            const tokenEnd = this.pos + text.length;
            const tokenLine = this.line;
            const tokenCol = this.col;

            // advance position and update line/col
            const lines = text.split(/\r\n?|\n/);
            if (lines.length > 1) {
                this.line += lines.length - 1;
                this.col = lines[lines.length - 1].length + 1;
            } else {
                this.col += text.length;
            }
            this.pos = tokenEnd;

            if (rule.ignore) {
                // skip and continue lexing in same state
                return this.nextToken();
            }

            // state transitions:
            // - when we consumed '<' in DATA, we enter TAG state
            // - when we consume '>' or '/>' in TAG, we return to DATA
            if (this.state === "DATA" && rule.type === "LT") {
                this.state = "TAG";
            } else if (this.state === "TAG" && (rule.type === "GT" || rule.type === "SLASH_GT")) {
                this.state = "DATA";
            }

            return {
                type: rule.type,
                value: text,
                start: tokenStart,
                end: tokenEnd,
                line: tokenLine,
                col: tokenCol,
            };
        }

        // nothing matched at current position => error (invalid character for current state)
        const ch = src[this.pos];
        throw new SyntaxError(`Unexpected token at ${this.line}:${this.col} (${JSON.stringify(ch)})`);
    }

    // generator to iterate tokens
    *tokens(): Generator<Token, void, unknown> {
        let t: Token | null;
        while ((t = this.nextToken()) !== null) {
            yield t;
        }
    }
}