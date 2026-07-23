/**
 * Utility functions for XSS prevention and NoSQL Query Injection defense.
 */

/**
 * Escapes dangerous HTML characters to prevent XSS (Cross-Site Scripting).
 * Note: Keeps emojis and standard unicode characters intact.
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Recursively removes keys starting with '$' or containing '.' to prevent MongoDB NoSQL Injection.
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  const clean = {}
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue // Strip MongoDB query operators like $gt, $ne, $where
    }
    clean[key] = sanitizeObject(obj[key])
  }
  return clean
}

/**
 * Express middleware to automatically sanitize req.body, req.query, and req.params.
 */
export function sanitizeMiddleware(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body)
  }
  if (req.query) {
    req.query = sanitizeObject(req.query)
  }
  if (req.params) {
    req.params = sanitizeObject(req.params)
  }
  next()
}
