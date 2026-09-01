/**
 * Minimal client-side renderer for the template *preview only*.
 *
 * This mirrors the subset of Go's html/template syntax the CV templates use
 * ({{ range }}, {{ if }}, {{ with }}, {{ .Field }}). It is deliberately not a
 * full implementation — the server remains the source of truth, and the
 * preview is an authoring aid. Anything it cannot parse falls back to showing
 * the raw template.
 */

const ACTION = /\{\{-?\s*(.*?)\s*-?\}\}/s

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Resolves a dotted path such as `.Resource.Name` against the scope stack. */
function resolve(expr, stack) {
  const trimmed = expr.trim()
  if (trimmed === '.') return stack[stack.length - 1]
  if (!trimmed.startsWith('.')) return undefined

  let value = stack[stack.length - 1]
  for (const key of trimmed.slice(1).split('.')) {
    if (value == null) return undefined
    value = value[key]
  }
  return value
}

function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0
  return Boolean(value)
}

/** Evaluates `or a b` / `and a b` / a single path. */
function evaluate(expr, stack) {
  const orMatch = expr.match(/^or\s+(.+)$/)
  if (orMatch) {
    return orMatch[1].split(/\s+/).some(part => isTruthy(resolve(part, stack)))
  }
  const andMatch = expr.match(/^and\s+(.+)$/)
  if (andMatch) {
    return andMatch[1].split(/\s+/).every(part => isTruthy(resolve(part, stack)))
  }
  return isTruthy(resolve(expr, stack))
}

/**
 * Renders `template` against `data`. Returns the rendered string, or throws if
 * the template has unbalanced blocks.
 */
function render(template, stack) {
  let out = ''
  let rest = template

  while (rest.length > 0) {
    const match = rest.match(ACTION)
    if (!match) {
      out += rest
      break
    }

    out += rest.slice(0, match.index)
    const action = match[1]
    rest = rest.slice(match.index + match[0].length)

    const rangeMatch = action.match(/^range\s+(.+)$/)
    const ifMatch = action.match(/^if\s+(.+)$/)
    const withMatch = action.match(/^with\s+(.+)$/)

    if (rangeMatch || ifMatch || withMatch) {
      const { body, elseBody, remainder } = takeBlock(rest)
      rest = remainder

      if (rangeMatch) {
        const items = resolve(rangeMatch[1], stack)
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            out += render(body, [...stack, item])
          }
        } else {
          out += elseBody ? render(elseBody, stack) : ''
        }
      } else if (ifMatch) {
        out += evaluate(ifMatch[1], stack)
          ? render(body, stack)
          : elseBody ? render(elseBody, stack) : ''
      } else {
        const value = resolve(withMatch[1], stack)
        out += isTruthy(value)
          ? render(body, [...stack, value])
          : elseBody ? render(elseBody, stack) : ''
      }
      continue
    }

    if (action === 'end' || action === 'else') {
      throw new Error(`unexpected {{ ${action} }}`)
    }

    const value = resolve(action, stack)
    out += value == null ? '' : escapeHtml(value)
  }

  return out
}

/** Consumes a block body up to its matching {{ end }}, honouring nesting. */
function takeBlock(source) {
  let depth = 1
  let body = ''
  let elseBody = null
  let target = 'body'
  let rest = source

  while (rest.length > 0) {
    const match = rest.match(ACTION)
    if (!match) throw new Error('missing {{ end }}')

    const before = rest.slice(0, match.index)
    const action = match[1]
    rest = rest.slice(match.index + match[0].length)

    const append = text => {
      if (target === 'body') body += text
      else elseBody += text
    }

    append(before)

    if (/^(range|if|with)\b/.test(action)) {
      depth++
      append(match[0])
    } else if (action === 'end') {
      depth--
      if (depth === 0) return { body, elseBody, remainder: rest }
      append(match[0])
    } else if (action === 'else' && depth === 1) {
      target = 'else'
      elseBody = ''
    } else {
      append(match[0])
    }
  }

  throw new Error('missing {{ end }}')
}

export function renderPreview(template, data) {
  try {
    return { html: render(template, [data]), error: null }
  } catch (err) {
    return { html: null, error: err.message }
  }
}
