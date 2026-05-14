# GottLab migration plan: Supabase/Next -> TanStack Start + Clerk + Convex

## Goal
Build a clean, maintainable GottLab app template with:
- TanStack Start + shadcn UI
- Clerk authentication and authorization via claims
- Convex as realtime database and backend
- Role-based middleware protection (no ad-hoc auth contexts)
- TanStack Store cart implementation
- GottLab branding/colors preserved

## Current baseline (main)
- Next.js App Router + Supabase SSR auth/session
- Supabase tables for users/products/reservas
- Custom auth + role gating in proxy.ts
- Cart implemented via reservation rows (realtime + polling)

## Migration strategy
1. Keep current main state as backup tag.
2. Replace app runtime with TanStack Start scaffold in-place.
3. Add Clerk server/client integration.
4. Add Convex backend (schema, auth config, user/cart models).
5. Implement role claims + route guard middleware/helpers.
6. Implement cart module using TanStack Store + Convex realtime sync.
7. Port GottLab brand tokens/colors and baseline layout.
8. Add compact module structure (components/lib/modules/config/routes).
9. Verify end-to-end auth flows and cart flows.

## Deliverables in this phase
- Working local app boot
- Register/sign-in/sign-out via Clerk
- Role-aware protected routes
- Convex-connected user profile and cart data paths
- Basic cart UI with add/remove/update quantity
- Initial docs for required Clerk/Convex env vars

## Out of scope (next phase)
- Full product/order migration from Supabase historical data
- Payments (MercadoPago/other)
- Shipping integration (Correos)
- Final production hardening and full E2E automation
