import { failure } from '../utils/apiResponse.js'
export const validate = (schema, source = 'body') => (req, res, next) => { const result = schema.safeParse(req[source]); if (!result.success) return failure(res, 400, 'VALIDATION_ERROR', 'The request contains invalid fields.', result.error.flatten()); req[source] = result.data; next() }
