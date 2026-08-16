# RSMethods Frontend

Frontend de RSMethods para explorar metodos de money making de Old School RuneScape, revisar detalle por variantes y gestionar likes/autenticacion.

## Overview

- Lista de metodos con filtros por categoria, intensidad de clicks, AFK, riesgo, skill, profitables y ordenamiento.
- Detalle de metodo con variantes, requisitos/recomendaciones y calculos de profit en base a items.
- Like/unlike optimista sincronizado entre listado, detalle y cuenta.
- Autenticacion con Supabase y rutas protegidas por sesion/rol (`super_admin`).
- Flujo de alta/edicion de metodos y variantes para administradores.

## Features

- Busqueda por nombre de metodo y filtros avanzados.
- Soporte de variantes por metodo con navegacion por tabs.
- Pagina de cuenta con resumen de likes y listado de favoritos.
- Refetch periodico configurable para datos vivos.
- Test suite con flujos criticos en `Vitest + Testing Library + MSW` y smoke E2E con `Playwright`.

## Stack

- React 19 + TypeScript
- Vite 6
- React Router 7
- TanStack Query 5
- Supabase Auth (`@supabase/supabase-js`)
- Tailwind CSS 4 + Radix/Base UI
- Vitest + Testing Library + MSW
- Playwright
- ESLint 9

## Setup local

### 1) Instalar dependencias

```bash
npm install
```

### 2) Elegir plantilla de entorno

Plantillas disponibles:

- `.env.example`: frontend local contra backend local.
- `.env.remote-tst.example`: frontend local contra backend TST remoto.
- `.env.remote-prod.example`: frontend local contra backend PRO remoto.

Ejemplo para local puro:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Ejemplo para probar local contra TST remoto:

```powershell
Copy-Item .env.remote-tst.example .env
```

Ejemplo para probar local contra PRO remoto:

```powershell
Copy-Item .env.remote-prod.example .env
```

### 3) Configurar variables de entorno

| Variable | Requerida | Descripcion |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Si | URL del proyecto Supabase usado por el frontend para auth. |
| `VITE_SUPABASE_ANON_KEY` | Si | Anon key de Supabase para auth en cliente. |
| `VITE_API_URL` | Si | Base URL del backend. En local normalmente `/api` para usar el proxy de Vite. En Vercel puede ser `/api` o una URL absoluta del backend segun la estrategia elegida. |
| `VITE_API_PROXY_TARGET` | No | Target del proxy de Vite cuando `VITE_API_USE_PROXY=true` (ej. `http://localhost:3000` o una URL Railway). |
| `VITE_API_USE_PROXY` | No | `true` hace que el frontend local llame a `/api` y Vite reenvie la request. `false` hace que el navegador llame directo a `VITE_API_URL`. |
| `VITE_QUERY_REFETCH_INTERVAL_MS` | No | Intervalo de refetch para React Query (default `60000`). |
| `VITE_QUERY_STALE_TIME_MS` | No | Ventana de frescura de cache para queries dinamicas. Si no se define, usa un margen automatico (20% del intervalo, maximo 5000ms). |

### 4) Recetas de entorno

#### Frontend local contra backend local

- Plantilla: `.env.example`
- Valores clave:
  - `VITE_API_URL=/api`
  - `VITE_API_PROXY_TARGET=http://localhost:3000`
  - `VITE_API_USE_PROXY=true`

#### Frontend local contra backend TST remoto

- Plantilla: `.env.remote-tst.example`
- Valores clave:
  - `VITE_API_URL=/api`
  - `VITE_API_PROXY_TARGET=https://osrstool-backend-tst.up.railway.app`
  - `VITE_API_USE_PROXY=true`

#### Frontend local contra backend PRO remoto

- Plantilla: `.env.remote-prod.example`
- Valores clave:
  - `VITE_API_URL=/api`
  - `VITE_API_PROXY_TARGET=https://osrstool-backend-production.up.railway.app`
  - `VITE_API_USE_PROXY=true`

#### Proyecto Vercel PRO

- Rama principal: `main`
- Variables recomendadas:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=https://osrstool-backend-production.up.railway.app
VITE_API_USE_PROXY=false
```

#### Proyecto Vercel TST

- Rama principal: `develop`
- Variables recomendadas:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=https://osrstool-backend-tst.up.railway.app
VITE_API_USE_PROXY=false
```

### 5) Levantar app

```bash
npm run dev
```

Demo local: [http://localhost:5173](http://localhost:5173)

## Arquitectura de carpetas

```text
src/
  auth/         # proveedor auth y guardas de rutas
  components/   # UI reusable + componentes de dominio
  contexts/     # estado compartido (username y errores de usuario)
  features/     # logica por feature (methods, method-detail, method-upsert)
  lib/          # cliente API/http, supabase, utilidades
  pages/        # vistas/rutas de alto nivel
tests/
  critical/     # flujos criticos (integracion con MSW)
  e2e/          # pruebas Playwright
  msw/          # servidor/handlers de mocks
  utils/        # helpers de render/providers para tests
```

## Decisiones y tradeoffs

- Se usa proxy `/api` en dev para evitar CORS y simplificar entorno local; tradeoff: acoplamiento a configuracion de Vite.
- Likes con actualizacion optimista para UX mas rapida; tradeoff: mayor complejidad de rollback/invalidation.
- Rutas pesadas (detalle/create/edit) cargan lazy para reducir JS inicial; tradeoff: fallback de carga al entrar.
- Refetch periodico configurable para mantener datos frescos; tradeoff: mas trafico al backend.
- Compatibilidad backend: `fetchMe` intenta `/users/me` y hace fallback a `/me`; tradeoff: logica extra de adaptacion en frontend.

## Scripts

- `npm run dev`: inicia entorno de desarrollo.
- `npm run build`: chequeo TypeScript + build de produccion.
- `npm run preview`: sirve el build localmente.
- `npm run lint`: corre ESLint.
- `npm run test`: corre tests con Vitest.
- `npm run test:e2e`: corre tests E2E con Playwright.
- `npm run test:e2e:ui`: Playwright en modo UI.

## CI (GitHub Actions)

- Workflow: `.github/workflows/ci.yml`
- Triggers: `push` y `pull_request`
- Pasos: `npm ci`, `npm run lint`, `npm run test`, `npm run build`

Para marcarlo como required status check en GitHub:

1. Ir a `Settings > Branches` del repo.
2. Editar (o crear) la branch protection rule de `main`.
3. Activar `Require status checks to pass before merging`.
4. Seleccionar el check `CI / quality`.

## Product changelog

The public changelog is stored in `src/content/changelog`.

Every PR into `develop` should include this section:

```markdown
## User-facing changelog

- Plain-English change that matters to users.
```

If a PR has no user-visible changes, keep:

```markdown
## User-facing changelog

No user-facing changes.
```

When a PR from `develop` into `main` is opened or updated, `.github/workflows/release-changelog.yml` automatically:

1. Finds merged PRs that are in `develop` and not yet in `main`.
2. Reads their `User-facing changelog` sections.
3. Generates a Markdown entry in `src/content/changelog`.
4. Updates `src/content/changelog/index.ts`.
5. Commits the generated changelog back to `develop`.

This keeps the production release and the public changelog in the same `develop -> main` promotion.

Because `develop` is protected, the workflow needs a repository secret named `RELEASE_CHANGELOG_TOKEN`. Use a fine-grained GitHub token from a user that has write access and is allowed to bypass the `develop` ruleset.

## Links

- Frontend repo: [RSMethods frontend repository](https://github.com/CarmineBD/osrstool-frontend)
- Backend repo: [RSMethods backend repository](https://github.com/CarmineBD/osrstool-backend)
- Backend API (prod): [Production backend API](https://osrstool-backend-production.up.railway.app)
