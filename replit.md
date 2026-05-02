# QR Studio

## Overview

A canvas-based QR code and graphic design editor. Users can create designs with QR codes, images, and text on a Fabric.js canvas — then save them to their account and export as PNG.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4
- **Auth**: Replit Auth (OIDC + PKCE) via `@workspace/replit-auth-web`
- **Canvas**: Fabric.js 6
- **QR codegen**: qrcode npm package

## Artifacts

- **qr-studio** (`/`) — Main React+Vite app with canvas editor
- **api-server** (`/api`) — Express 5 API server

## Key Features

- Fabric.js canvas editor (drag, resize, rotate objects)
- QR code generation from URL/text
- Add images via file upload
- Add text elements (IText, editable on canvas)
- Left toolbar with icon-only buttons and Russian-language tooltips
- Right properties panel: position, opacity, border/stroke, border radius, shadow, filters
- Duplicate, delete, flip (X/Y), bring to front/back
- Save designs to account (Replit Auth required)
- Load saved designs (thumbnail grid)
- Export canvas as PNG

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `users` — Replit Auth users (id, email, firstName, lastName, profileImageUrl)
- `sessions` — Auth sessions (sid, sess jsonb, expire)
- `designs` — User designs (id, userId, title, canvasData jsonb, thumbnail text, timestamps)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
