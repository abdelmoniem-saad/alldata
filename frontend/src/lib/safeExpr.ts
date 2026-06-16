/**
 * safeExpr — tiny safe expression evaluator used by I5 directives.
 *
 * Used by:
 *   - decision `branch` predicates (rare; usually a literal id match)
 *   - playground `goal.success_when` predicates
 *   - playground observation `when:` clauses
 *
 * NOT a general expression engine. The deliberate scope is:
 *   - identifiers       resolve from the provided scope (TopicState)
 *   - number literals   `1.5`, `-0.3`, `42`
 *   - string literals   `"treat_all"` or `'retest'`
 *   - boolean literals  `true`, `false`
 *   - comparison ops    `<` `<=` `>` `>=` `==` `!=`
 *   - boolean ops       `and` `or` `not` (or `&&` `||` `!`)
 *   - arithmetic        `+` `-` `*` `/`
 *   - parentheses       `(...)`
 *   - function calls    `abs(x)`, `min(a,b)`, `max(a,b)` (whitelisted)
 *
 * No `eval`, no `Function`, no member access (`a.b`), no indexing (`a[0]`),
 * no method calls. Authors who want more should extend the whitelist here.
 *
 * The evaluator is a small recursive-descent parser → AST → tree walker.
 * It's intentionally ~150 lines so any reviewer can read it end to end.
 */

type Scope = Record<string, unknown>

type Token =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }

const KEYWORDS: Record<string, Token> = {
  and: { type: 'op', value: '&&' },
  or:  { type: 'op', value: '||' },
  not: { type: 'op', value: '!' },
  true:  { type: 'num', value: 1 },
  false: { type: 'num', value: 0 },
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
}

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '(' || c === ')') { out.push({ type: 'paren', value: c }); i++; continue }
    if (c === ',') { out.push({ type: 'comma' }); i++; continue }
    // numbers (incl. leading minus only when not following an operand)
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      out.push({ type: 'num', value: parseFloat(src.slice(i, j)) })
      i = j
      continue
    }
    // strings
    if (c === '"' || c === "'") {
      const quote = c
      let j = i + 1
      while (j < src.length && src[j] !== quote) j++
      out.push({ type: 'str', value: src.slice(i + 1, j) })
      i = j + 1
      continue
    }
    // multi-char operators
    const two = src.slice(i, i + 2)
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) {
      out.push({ type: 'op', value: two })
      i += 2
      continue
    }
    if ('<>+-*/!'.includes(c)) {
      out.push({ type: 'op', value: c })
      i++
      continue
    }
    // identifiers / keywords / function names
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      const id = src.slice(i, j)
      if (id in KEYWORDS) out.push(KEYWORDS[id])
      else out.push({ type: 'ident', value: id })
      i = j
      continue
    }
    throw new Error(`safeExpr: unexpected character "${c}" at position ${i}`)
  }
  return out
}

// Pratt-style precedence walker.
const PRECEDENCE: Record<string, number> = {
  '||': 1, '&&': 2,
  '==': 3, '!=': 3, '<': 3, '<=': 3, '>': 3, '>=': 3,
  '+':  4, '-':  4,
  '*':  5, '/':  5,
}

class Parser {
  private pos = 0
  constructor(private tokens: Token[]) {}
  private peek(): Token | undefined { return this.tokens[this.pos] }
  private eat(): Token { return this.tokens[this.pos++] }

  parse(): unknown { return this.parseBinary(0) }

  private parseBinary(minPrec: number): any {
    let left = this.parseUnary()
    while (true) {
      const t = this.peek()
      if (!t || t.type !== 'op' || !(t.value in PRECEDENCE)) break
      const prec = PRECEDENCE[t.value]
      if (prec < minPrec) break
      this.eat()
      const right = this.parseBinary(prec + 1)
      left = { kind: 'bin', op: t.value, left, right }
    }
    return left
  }

  private parseUnary(): any {
    const t = this.peek()
    if (t?.type === 'op' && (t.value === '!' || t.value === '-')) {
      this.eat()
      return { kind: 'unary', op: t.value, arg: this.parseUnary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): any {
    const t = this.eat()
    if (!t) throw new Error('safeExpr: unexpected end of input')
    if (t.type === 'num') return { kind: 'num', value: t.value }
    if (t.type === 'str') return { kind: 'str', value: t.value }
    if (t.type === 'paren' && t.value === '(') {
      const e = this.parseBinary(0)
      const close = this.eat()
      if (!(close?.type === 'paren' && close.value === ')')) throw new Error('safeExpr: missing )')
      return e
    }
    if (t.type === 'ident') {
      // function call?
      const next = this.peek()
      if (next?.type === 'paren' && next.value === '(') {
        this.eat()
        const args: any[] = []
        if (!(this.peek()?.type === 'paren' && (this.peek() as any).value === ')')) {
          args.push(this.parseBinary(0))
          while (this.peek()?.type === 'comma') { this.eat(); args.push(this.parseBinary(0)) }
        }
        const close = this.eat()
        if (!(close?.type === 'paren' && close.value === ')')) throw new Error('safeExpr: missing ) in call')
        if (!(t.value in FUNCTIONS)) throw new Error(`safeExpr: unknown function "${t.value}"`)
        return { kind: 'call', name: t.value, args }
      }
      return { kind: 'ident', name: t.value }
    }
    throw new Error(`safeExpr: unexpected token ${JSON.stringify(t)}`)
  }
}

function evalNode(node: any, scope: Scope): unknown {
  switch (node.kind) {
    case 'num': case 'str': return node.value
    case 'ident': {
      const v = scope[node.name]
      // Coerce booleans → 0/1 so comparisons work uniformly.
      if (typeof v === 'boolean') return v ? 1 : 0
      return v
    }
    case 'unary': {
      const a = evalNode(node.arg, scope) as any
      if (node.op === '-') return -Number(a)
      if (node.op === '!') return !a
      throw new Error(`safeExpr: unknown unary ${node.op}`)
    }
    case 'bin': {
      const op = node.op
      // Short-circuit logicals so missing scope keys don't poison the other branch.
      if (op === '&&') return Boolean(evalNode(node.left, scope)) && Boolean(evalNode(node.right, scope))
      if (op === '||') return Boolean(evalNode(node.left, scope)) || Boolean(evalNode(node.right, scope))
      const l = evalNode(node.left, scope) as any
      const r = evalNode(node.right, scope) as any
      switch (op) {
        case '==': return l === r || Number(l) === Number(r)
        case '!=': return l !== r && Number(l) !== Number(r)
        case '<':  return Number(l) <  Number(r)
        case '<=': return Number(l) <= Number(r)
        case '>':  return Number(l) >  Number(r)
        case '>=': return Number(l) >= Number(r)
        case '+':  return (typeof l === 'string' || typeof r === 'string') ? String(l) + String(r) : Number(l) + Number(r)
        case '-':  return Number(l) - Number(r)
        case '*':  return Number(l) * Number(r)
        case '/':  return Number(l) / Number(r)
      }
      throw new Error(`safeExpr: unknown op ${op}`)
    }
    case 'call': {
      const fn = FUNCTIONS[node.name]
      const args = node.args.map((a: any) => Number(evalNode(a, scope)))
      return fn(...args)
    }
  }
  throw new Error(`safeExpr: unknown node ${JSON.stringify(node)}`)
}

/**
 * Evaluate `expr` against `scope`. Returns `false` on parse error rather than
 * throwing, since predicates run on every state change and a typo in author
 * content shouldn't crash the page. The error is logged once for debugging.
 */
const _loggedErrors = new Set<string>()
export function safeEval(expr: string | undefined | null, scope: Scope): unknown {
  if (!expr) return false
  try {
    const ast = new Parser(tokenize(expr)).parse()
    return evalNode(ast, scope)
  } catch (err) {
    if (!_loggedErrors.has(expr)) {
      _loggedErrors.add(expr)
      console.warn(`safeExpr failed for "${expr}":`, err)
    }
    return false
  }
}

/** Convenience: coerce result to boolean. */
export function safeBool(expr: string | undefined | null, scope: Scope): boolean {
  return Boolean(safeEval(expr, scope))
}
