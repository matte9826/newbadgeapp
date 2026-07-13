// Vercel serverless entry point.
// Every /api/* request is routed here (see vercel.json) and handled by the
// Express app, which keeps its full "/api/..." routing intact.
import app from "../server.js";

export default app;
