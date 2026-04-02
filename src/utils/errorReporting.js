import { logger } from './logger.js'

function toSerializableError(error, seen = new WeakSet()) {
  if (error == null) return error
  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return error
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: toSerializableError(error.cause, seen),
    }
  }
  if (typeof error !== 'object') {
    return String(error)
  }
  if (seen.has(error)) {
    return '[Circular]'
  }
  seen.add(error)

  const preferredKeys = ['code', 'message', 'details', 'hint', 'status', 'statusCode', 'error', 'stack']
  const out = {}

  preferredKeys.forEach((key) => {
    if (key in error && typeof out[key] === 'undefined') {
      out[key] = toSerializableError(error[key], seen)
    }
  })

  Object.keys(error).forEach((key) => {
    if (typeof out[key] !== 'undefined') return
    out[key] = toSerializableError(error[key], seen)
  })

  return out
}

export function reportError(label, error, context) {
  const parts = [label]
  if (typeof context !== 'undefined') {
    parts.push(context)
  }
  parts.push(toSerializableError(error))
  logger.error(...parts)
}

export function reportWarning(label, warning, context) {
  const parts = [label]
  if (typeof context !== 'undefined') {
    parts.push(context)
  }
  parts.push(toSerializableError(warning))
  logger.warn(...parts)
}
