/**
 * Syntax highlighting for the code samples on our marketing and docs pages.
 *
 * This is deliberately not a real highlighter. The snippets it colors are
 * string literals in our own source, written by us, in two languages — so a
 * tokenizer that handles those two languages well beats shipping a megabyte
 * of TextMate grammars to color four blocks. It emits tokens rather than an
 * HTML string, which keeps the output as ordinary vdom: no InnerHTML escape
 * hatch, and it diffs like everything else on the page.
 *
 * The palette is VS Code's default Dark+, so a snippet here looks the way it
 * will look when the reader pastes it into their editor.
 *
 * @since 1.0.0
 */

import type { Html, HtmlBuilder } from "foldkit/html";

/**
 * The kinds of token we distinguish, named after the Light+ scopes they take
 * their color from rather than after grammar concepts.
 *
 * @since 1.0.0
 * @category Models
 */
export type TokenKind =
    | "comment"
    | "string"
    | "number"
    /** Control flow and module structure: `import`, `from`, `return`. Purple. */
    | "keyword"
    /** Declarations: `const`, `function`, `class`. Blue. */
    | "storage"
    /** Capitalized identifiers, which in our snippets are always types or namespaces. Teal. */
    | "type"
    /** An identifier in call position. Olive. */
    | "function"
    /** Any other identifier. Navy. */
    | "variable"
    /** Punctuation, operators, and whitespace. Black. */
    | "plain";

/**
 * A run of source text that shares one color.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Token {
    readonly text: string;
    readonly kind: TokenKind;
}

/**
 * The languages we know how to color.
 *
 * @since 1.0.0
 * @category Models
 */
export type Language = "ts" | "sh";

/** Light+ paints these purple; they are `keyword.control` in the grammar. */
const CONTROL_KEYWORDS = new Set([
    "import",
    "export",
    "from",
    "as",
    "return",
    "yield",
    "await",
    "async",
    "if",
    "else",
    "for",
    "of",
    "in",
    "while",
    "try",
    "catch",
    "finally",
    "throw",
    "new",
    "typeof",
    "default",
]);

/** Light+ paints these blue; they are `storage` in the grammar. */
const STORAGE_KEYWORDS = new Set([
    "const",
    "let",
    "var",
    "function",
    "class",
    "interface",
    "type",
    "extends",
    "implements",
    "true",
    "false",
    "null",
    "undefined",
    "void",
    "this",
]);

/**
 * One pass of alternation, ordered so that the greedy constructs — comments
 * and strings — win before anything inside them can be mistaken for code.
 * Every branch is captured so the matched text can be classified by which
 * group fired.
 */
const TS_PATTERN = new RegExp(
    [
        String.raw`(\/\/[^\n]*)`, // line comment
        String.raw`(\/\*[\s\S]*?\*\/)`, // block comment
        String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\]|\\.)*\`)`, // string
        String.raw`(\b\d[\d_]*(?:\.\d+)?\b)`, // number
        String.raw`([A-Za-z_$][\w$]*)`, // identifier
    ].join("|"),
    "g"
);

/**
 * Shell is quieter than TypeScript in Light+: comments and strings carry
 * color, and the rest of the line — commands, flags, urls — stays black.
 */
const SH_PATTERN = new RegExp(
    [
        String.raw`(#[^\n]*)`, // comment
        String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`, // string
    ].join("|"),
    "g"
);

/** Classifies a bare identifier by what surrounds it in the source. */
const classifyIdentifier = (word: string, source: string, start: number, end: number): TokenKind => {
    if (CONTROL_KEYWORDS.has(word)) return "keyword";
    if (STORAGE_KEYWORDS.has(word)) return "storage";

    // A binding takes the color of what it is, not of how it is spelled:
    // `const Live = ...` is a variable however much it reads like a type.
    if (/(?:const|let|var)\s+$/.test(source.slice(0, start))) return "variable";

    // Elsewhere a capital letter means a type or a namespace in the snippets
    // we ship, and Light+ colors both the same teal.
    if (/^[A-Z]/.test(word)) return "type";

    // Anything called is a function, including `foo.bar(` — the member name is
    // what sits in call position, which is what the grammar keys off too.
    return /^\s*\(/.test(source.slice(end)) ? "function" : "variable";
};

/**
 * Splits source into colored runs. Text that no branch claims comes back as
 * `plain`, so concatenating every token's text reproduces the input exactly.
 *
 * @since 1.0.0
 * @category Highlighting
 */
export const highlight = (language: Language, source: string): ReadonlyArray<Token> => {
    const pattern = language === "ts" ? TS_PATTERN : SH_PATTERN;
    const tokens: Array<Token> = [];
    let cursor = 0;

    pattern.lastIndex = 0;
    for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
        if (match.index > cursor) {
            tokens.push({ text: source.slice(cursor, match.index), kind: "plain" });
        }

        const [text] = match;
        const kind: TokenKind =
            language === "ts"
                ? match[1] !== undefined || match[2] !== undefined
                    ? "comment"
                    : match[3] !== undefined
                      ? "string"
                      : match[4] !== undefined
                        ? "number"
                        : classifyIdentifier(text, source, match.index, match.index + text.length)
                : match[1] !== undefined
                  ? "comment"
                  : "string";

        tokens.push({ text, kind });
        cursor = match.index + text.length;
    }

    if (cursor < source.length) {
        tokens.push({ text: source.slice(cursor), kind: "plain" });
    }

    return tokens;
};

/**
 * Dark+ token colors, as utilities off the `--color-code-*` theme tokens.
 * Plain text inherits the block's own color rather than setting its own, so
 * punctuation costs nothing.
 */
const tokenClass: Readonly<Record<TokenKind, string>> = {
    comment: "text-code-comment",
    string: "text-code-string",
    number: "text-code-number",
    keyword: "text-code-keyword",
    storage: "text-code-storage",
    type: "text-code-type",
    function: "text-code-function",
    variable: "text-code-variable",
    plain: "",
};

/**
 * A highlighted block of source, on the dark background its palette was
 * designed for.
 *
 * @since 1.0.0
 * @category Views
 */
export const codeBlock = <M>(h: HtmlBuilder<M>, language: Language, source: string): Html =>
    h.pre(
        [h.Class("font-code text-code-plain block overflow-x-auto rounded-lg bg-gray-800 px-4 py-3 text-sm")],
        [
            h.code(
                [],
                highlight(language, source).map((token) =>
                    token.kind === "plain" ? token.text : h.span([h.Class(tokenClass[token.kind])], [token.text])
                )
            ),
        ]
    );
