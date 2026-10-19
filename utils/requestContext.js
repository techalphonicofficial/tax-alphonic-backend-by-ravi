const { AsyncLocalStorage, AsyncResource } = require('async_hooks');

// Per-request context (requestId, ip, user, ...) available anywhere in the call
// chain: the logger stamps it on every line and the audit hooks read the user from it.
const storage = new AsyncLocalStorage();

const run = (context, fn) => storage.run(context, fn);

const get = () => storage.getStore() || null;

// Stream-based middlewares (multer/busboy) call next() from an event callback,
// which drops the async context. Binding next keeps the request context alive.
const bindMiddleware = (middleware) => (req, res, next) => middleware(req, res, AsyncResource.bind(next));

module.exports = { run, get, bindMiddleware };
