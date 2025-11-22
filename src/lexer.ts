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
        { type: "PROC_INSTR", regex: /^<\?[\s\S]*?\?>/ },

        // comments
        { type: "COMMENT", regex: /^<!--[\s\S]*?-->/ },

        // CDATA sections
        { type: "CDATA", regex: /^<!\[CDATA\[[\s\S]*?\]\]>/ },

        // DOCTYPE (simple, not fully robust for nested bracketed subsets)
        { type: "DOCTYPE", regex: /^<!DOCTYPE[\s\S]*?>/i },

        // an opening angle bracket starts tag mode; consume '<' as token then switch
        { type: "LT", regex: /^</ },

        // entity references (&name; or numeric)
        { type: "ENTITY", regex: /^&#?\w+;?/ },

        // text content until next '<' or '&' (note: preserves whitespace in text)
        { type: "TEXT", regex: /^[^<&]+/ },
    ];

    private tagRules: Rule[] = [
        // inside tags whitespace separates attributes -> ignore
        { type: "WHITESPACE", regex: /^\s+/, ignore: true },

        // slash for closing tag or self-close marker (handled as own token)
        { type: "SLASH", regex: /^\// },

        // tag name (first identifier you see in a tag)
        { type: "TAG_NAME", regex: /^[A-Za-z_:][\w:.-]*/ },

        // attribute name
        { type: "ATTR_NAME", regex: /^[A-Za-z_:][\w:.-]*/ },

        // equal sign between attr name and value
        { type: "EQUAL", regex: /^=/ },

        // attribute values: double-quoted or single-quoted (XML does not allow backslash escapes)
        { type: "ATTR_VALUE_DQ", regex: /^"(?:[^"]*)"/ },
        { type: "ATTR_VALUE_SQ", regex: /^'(?:[^']*)'/ },

        // end of tag; match '/>' first for self-closing
        { type: "SLASH_GT", regex: /^\/>/ },
        { type: "GT", regex: /^>/ },

        // fallback: any other single punctuator inside tag (rare for XML)
        { type: "PUNCT", regex: /^[=]/ },
    ];

    constructor(input = "") {
        this.input = input;
    }

    /*
        setInput(input: string) {
            this.input = input;
            this.pos = 0;
            this.line = 1;
            this.col = 1;
            this.state = "DATA";
        }
    */
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

    /*
        tokenizeAll(): Token[] {
            const out: Token[] = [];
            for (const t of this.tokens()) out.push(t);
            return out;
        }
    
        // peek (cheap clone) -- clones just the lexical state
        peek(): Token | null {
            const save = { pos: this.pos, line: this.line, col: this.col, state: this.state };
            try {
                return this.nextToken();
            } finally {
                this.pos = save.pos;
                this.line = save.line;
                this.col = save.col;
                this.state = save.state;
            }
        }
    */
}