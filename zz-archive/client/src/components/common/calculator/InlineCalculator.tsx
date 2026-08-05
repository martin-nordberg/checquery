import {createSignal, onCleanup} from "solid-js"

// Recursive-descent parser for arithmetic expressions: +, -, *, /, (), decimals
type Token =
    | { type: 'num'; val: number }
    | { type: 'op'; val: '+' | '-' | '*' | '/' }
    | { type: 'lparen' }
    | { type: 'rparen' }

function tokenize(expr: string): Token[] {
    const tokens: Token[] = []
    const re = /(\d+(?:\.\d+)?|[+\-*/()])/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(expr)) !== null) {
        const gap = expr.slice(lastIndex, match.index).trim()
        if (gap.length > 0) {
            throw new Error(`Unexpected characters: ${gap}`)
        }
        lastIndex = re.lastIndex
        const s = match[1] ?? ""
        if (s === '(') { tokens.push({ type: 'lparen' }) }
        else if (s === ')') { tokens.push({ type: 'rparen' }) }
        else if (s === '+' || s === '-' || s === '*' || s === '/') { tokens.push({ type: 'op', val: s }) }
        else { tokens.push({ type: 'num', val: parseFloat(s) }) }
    }
    const trailing = expr.slice(lastIndex).trim()
    if (trailing.length > 0) {
        throw new Error(`Unexpected characters: ${trailing}`)
    }
    return tokens
}

function parseAndEvaluate(expr: string): number {
    const trimmed = expr.trim()
    if (trimmed.length === 0) {
        throw new Error("Empty expression")
    }
    const tokens = tokenize(trimmed)
    if (tokens.length === 0) {
        throw new Error("Empty expression")
    }
    let pos = 0

    function peek(): Token | undefined {
        return tokens[pos]
    }

    function consume(): Token {
        const t = tokens[pos]
        if (t === undefined) { throw new Error("Unexpected end of expression") }
        pos++
        return t
    }

    function parseExpr(): number {
        return parseAddSub()
    }

    function parseAddSub(): number {
        let left = parseMulDiv()
        while (pos < tokens.length) {
            const t = peek()
            if (t?.type === 'op' && (t.val === '+' || t.val === '-')) {
                consume()
                const right = parseMulDiv()
                left = t.val === '+' ? left + right : left - right
            } else {
                break
            }
        }
        return left
    }

    function parseMulDiv(): number {
        let left = parseUnary()
        while (pos < tokens.length) {
            const t = peek()
            if (t?.type === 'op' && (t.val === '*' || t.val === '/')) {
                consume()
                const right = parseUnary()
                if (t.val === '/' && right === 0) { throw new Error("Division by zero") }
                left = t.val === '*' ? left * right : left / right
            } else {
                break
            }
        }
        return left
    }

    function parseUnary(): number {
        const t = peek()
        if (t?.type === 'op' && t.val === '-') {
            consume()
            return -parsePrimary()
        }
        if (t?.type === 'op' && t.val === '+') {
            consume()
            return parsePrimary()
        }
        return parsePrimary()
    }

    function parsePrimary(): number {
        const t = consume()
        if (t.type === 'num') {
            return t.val
        }
        if (t.type === 'lparen') {
            const val = parseExpr()
            const close = consume()
            if (close.type !== 'rparen') { throw new Error("Expected closing parenthesis") }
            return val
        }
        throw new Error(`Unexpected token: ${JSON.stringify(t)}`)
    }

    const result = parseExpr()
    if (pos !== tokens.length) {
        throw new Error("Unexpected token after expression")
    }
    return result
}

type InlineCalculatorProps = {
    onClose: () => void
}

const InlineCalculator = (props: InlineCalculatorProps) => {
    const [formula, setFormula] = createSignal("")
    const [result, setResult] = createSignal<string | null>(null)
    const [timer, setTimer] = createSignal<ReturnType<typeof setTimeout> | null>(null)

    onCleanup(() => {
        const t = timer()
        if (t !== null) { clearTimeout(t) }
    })

    const evaluate = (value: string) => {
        const existing = timer()
        if (existing !== null) { clearTimeout(existing) }
        setTimer(null)
        if (value.trim() === "") {
            setResult(null)
            return
        }
        try {
            const val = parseAndEvaluate(value)
            if (!isFinite(val)) { throw new Error("Result is not finite") }
            setResult(val.toFixed(2))
        } catch {
            setResult("Error!")
        }
    }

    const handleInput = (value: string) => {
        setFormula(value)
        const existing = timer()
        if (existing !== null) { clearTimeout(existing) }
        if (value.trim() === "") {
            setResult(null)
            setTimer(null)
            return
        }
        const t = setTimeout(() => evaluate(value), 2000)
        setTimer(t)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            evaluate(formula())
        }
    }

    const handleCopy = async () => {
        const r = result()
        if (r !== null && r !== "Error!") {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(r)
            } else {
                const ta = document.createElement('textarea')
                ta.value = r
                ta.style.position = 'fixed'
                ta.style.opacity = '0'
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
            }
        }
        props.onClose()
    }

    const isError = () => result() === "Error!"
    const hasResult = () => result() !== null && !isError()

    return (
        <div class="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 shadow-sm">
            <input
                type="text"
                placeholder="e.g. 2*300 + 17.98/2"
                value={formula()}
                onInput={(e) => handleInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                autofocus
                class="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
            />
            <span class="text-sm font-semibold text-gray-500">=</span>
            <div
                class={`px-3 py-1 text-sm rounded border font-mono min-w-[120px] text-right select-all leading-5 ${
                    isError()
                        ? 'text-red-600 border-red-200 bg-red-50'
                        : 'text-gray-800 border-gray-200 bg-gray-50'
                }`}
            >
                {result() ?? "\u00A0"}
            </div>
            <button
                onClick={handleCopy}
                disabled={!hasResult()}
                title="Copy result and close"
                class="p-1 text-gray-500 hover:text-gray-700 hover:bg-amber-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {/* Clipboard copy icon */}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            </button>
            <button
                onClick={props.onClose}
                title="Close calculator"
                class="p-1 text-gray-500 hover:text-gray-700 hover:bg-amber-200 rounded"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    )
}

export default InlineCalculator
