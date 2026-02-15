# OSRSTool Frontend

Frontend de OSRSTool para explorar metodos de money making de Old School RuneScape, revisar detalle por variantes y gestionar likes/autenticacion.

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

### 2) Crear `.env` desde `.env.example`

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3) Configurar variables de entorno

| Variable | Requerida | Descripcion |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Si | URL del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Si | Anon key de Supabase para auth en cliente. |
| `VITE_API_URL` | Si | Base URL del backend. En dev puede ser `/api` con proxy. |
| `VITE_API_PROXY_TARGET` | No | Target del proxy de Vite (ej. `http://localhost:3000`). |
| `VITE_API_USE_PROXY` | No | `true` por defecto en dev. En `false` llama directo a `VITE_API_URL`. |
| `VITE_QUERY_REFETCH_INTERVAL_MS` | No | Intervalo de refetch para React Query (default `60000`). |

### 4) Levantar app

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

## Links

- Frontend repo: [github.com/CarmineBD/osrstool-frontend](https://github.com/CarmineBD/osrstool-frontend)
- Backend repo: [github.com/CarmineBD/osrstool-backend](https://github.com/CarmineBD/osrstool-backend)
- Backend API (prod): [osrstool-backend-production.up.railway.app](https://osrstool-backend-production.up.railway.app)
