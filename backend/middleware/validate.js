import AppError from '../utils/AppError.js'

/**
 * Express middleware that validates the request body against a Zod schema.
 * If validation fails, it formats the error messages and returns 400.
 * If validation succeeds, it replaces req.body with the sanitized/parsed data.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const details = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return next(new AppError('Validation failed', 400, details))
    }

    req.body = result.data
    next()
  }
}

export default validate;
