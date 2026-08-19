export function success(res, data, status = 200) { return res.status(status).json({ success: true, data, error: null }) }
export function failure(res, status, code, message, details = null) { return res.status(status).json({ success: false, data: null, error: { code, message, details } }) }
export class HttpError extends Error { constructor(status, code, message, details = null) { super(message); this.status = status; this.code = code; this.details = details } }
