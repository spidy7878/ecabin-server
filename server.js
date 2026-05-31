// Root-level iisnode entry point.
// iisnode passes req.url correctly only when the handler path is at root level.
// This shim loads the actual application from src/.
require('./src/server');
