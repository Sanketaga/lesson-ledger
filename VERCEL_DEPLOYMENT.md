# Vercel Deployment Guide

Lesson Ledger is prepared for a **Vite static frontend** plus a Vercel Node Function for the same-origin `/api/*` routes. The browser application is emitted to `dist/public`; `api/[...path].ts` supplies the Express/tRPC, OAuth, and storage-proxy routes. The SPA rewrite keeps direct visits to routes such as `/learn/neural%20network` inside the React application.

## Before creating a Vercel deployment

Create a new Vercel project from the repository that contains this release. Vercel will use `pnpm run vercel-build` and publish `dist/public`. Keep the default Node.js runtime; do not set an Edge runtime for the API function.

The following values must be configured in Vercel Project Settings for **Preview** and **Production** as appropriate. Never commit them to the repository.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes, when authentication is enabled | Externally reachable MySQL/TiDB connection string. |
| `JWT_SECRET` | Yes | Long, randomly generated secret used for session signing. |
| `VITE_APP_ID` | Yes, when using the configured OAuth provider | Client OAuth application identifier. |
| `OAUTH_SERVER_URL` | Yes, when using the configured OAuth provider | OAuth token and user-information service URL. |
| `VITE_OAUTH_PORTAL_URL` | Yes, when using the configured OAuth provider | Browser login portal URL. |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Required only for the `/manus-storage/*` proxy | Storage-proxy service endpoint and credential. |
| `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY` | Only if a frontend Forge feature is enabled | Frontend service configuration. |

> The existing Manus OAuth and Forge credentials are platform-managed. They cannot be copied automatically to Vercel. If you retain those integrations, create or obtain externally valid credentials and register the Vercel callback URL with the relevant provider.

## OAuth callback registration

After the first Vercel deployment creates a domain, register this exact callback URL with the OAuth provider:

```text
https://YOUR-VERCEL-DOMAIN/api/oauth/callback
```

Set the same Vercel domain as the application’s allowed web origin. Repeat this setup for a custom domain if you later switch from the Vercel-generated domain.

## User-managed Vercel release

1. Push this checkpoint to a Git repository you control.
2. In Vercel, choose **Add New → Project**, import that repository, and confirm the detected build command and output directory.
3. Add every required environment value, separating Preview and Production values where necessary.
4. Deploy a **Preview** first; verify `/`, `/learn/neural%20network`, `/api/trpc`, sign-in, live search, and fullscreen playback.
5. Register the preview or production callback URL with OAuth, then promote the tested deployment to Production.

Vercel’s current Express guidance supports exporting an Express application from a recognized function entrypoint, while static browser assets are served separately from the configured output directory. See the official [Express on Vercel](https://vercel.com/docs/frameworks/backend/express), [Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), and [environment-variable](https://vercel.com/docs/environment-variables) documentation for platform-level details.
