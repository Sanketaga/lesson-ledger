/**
 * Explicit Vercel Function for every tRPC procedure path under /api/trpc/*.
 * Keeping this route separate from the SPA rewrite prevents production API
 * requests from being served as static application routes.
 */
import app from "../_runtime/app.mjs";

export default app;
