# MediShop — Medical E-Commerce with Multi-Tier Pricing

A medical supply storefront and admin panel where every product has a **dynamic number of pricing tiers** (bundles). Each tier is an independent offer with its own pack count and its own bundle price, and the cart prices them correctly (the bundle price is **never** treated as a per-pack price). Built with React, TypeScript and Tailwind on a real PostgreSQL database.(built in backend provided by Lovable and based on Supabase).

## Links

- **Live app:** https://medbasket-tiered-market.lovable.app
- **Admin (product management):** https://medbasket-tiered-market.lovable.app/admin
- **Repository:** https://github.com/MennaEzzelarab/medsupply-market

---

## Project Structure

```
src/
├─ routes/                 # File-based routes (TanStack Router)
│  ├─ __root.tsx           # App shell: providers, header, toaster
│  ├─ index.tsx            # Storefront: filters, search, sort, product cards
│  ├─ product.$id.tsx      # Product details: tier + quantity selection
│  ├─ cart.tsx             # Cart page
│  └─ admin.tsx            # Product / brand / category / tier management
├─ lib/
│  ├─ pricing.ts           # Pure money math (lineTotal, packCount, cartTotal, clampBundleQty, formatKWD)
│  ├─ cart.tsx             # Cart state, localStorage persistence, restore + validation
│  ├─ cart-sync.ts         # reconcileCart(): checks the cart against the live catalog
│  └─ catalog.ts           # Supabase queries, filter/sort logic
├─ components/             # Header, loading/error/empty states, dialogs, cart notices
│  └─ ui/                  # shadcn/ui primitives
├─ integrations/supabase/  # Supabase client and generated types
└─ test/                   # Route and metadata tests (unit tests sit next to the code as *.test.ts)
drizzle/
└─ migrations/             # SQL: schema + seed, save_product function, RESTRICT deletes
```

---

## Local Setup

### Prerequisites
- Node.js 22 (tested) or Bun installed.

### Installation
```bash
# Clone repository
git clone https://github.com/MennaEzzelarab/medsupply-market.git
cd medsupply-market

# Install dependencies
npm install
# or
bun install
```

### Development Server
```bash
npm run dev
```
The dev server prints its local URL in the terminal (it defaults to port 8080).

---

## Tech Stack

- **Frontend:** React 19, TypeScript, TanStack Start (SSR + file-based routing), TanStack Query
- **Styling:** Tailwind CSS v4, shadcn/ui, Lucide icons. Theme: teal `#0caca7` for primary buttons and accents (with dark text for contrast), `#087e7a` for teal text on white, `#e6f7f6` for light backgrounds
- **Backend / database:** PostgreSQL through Lovable Cloud (Supabase), with foreign keys, CHECK constraints and a transactional `save_product` function
- **Client state:** the cart is kept in `localStorage`, validated and sanitized on load
- **Testing:** Vitest

## AI Tools Used

- **Lovable** — initial full-stack scaffolding, database schema and migrations, UI generation, deployment
- **Google Antigravity** — cart/catalog reconciliation logic, tests, edge-case hardening and code review
- **Claude (Anthropic)** — project planning, code review against the assessment brief, test checklists and documentation drafting

---

## Known Limitations

- **No authentication.** Out of scope per the brief, so `/admin` is public. The database's Row-Level Security policies are also open, so anyone with the public key can read and write through the API. 
- **Image URLs only.** Product images are entered as URLs (validated as http/https). There is no file upload.
- **"At least one tier" is enforced in the admin UI, not in the database.** The `save_product` function accepts an empty tier list. The storefront handles a product with no tiers by showing "No pricing yet".
- **The cart lives in the browser** (`localStorage`), not the database, and is not shared between devices. Cart sync needs a network connection; offline, the cart keeps its last known prices.
- **Quantity cap:** bundle quantity is limited to 1–99 as a sanity limit against typos. It is a single constant and easy to change.
- **Home-page cards add one bundle.** Larger quantities are chosen on the details page.
- **Filtering, search and sorting run in the browser** over the full product list, which is fine for a small catalog. A large catalog would need server-side queries and pagination.

---

## Features

### Customer side
- **Home (`/`)** — product cards with image, name, brand, category and **all** pricing tiers. Filter by brand and by category, search by name/description, and sort by name or price. Search and sort are kept in the URL, so they survive a refresh. A card lets the customer pick a tier and add one bundle to the cart, or open the details page.
- **Product details (`/product/:id`)** — product info, brand, category and all tiers. The customer selects a tier and a number of bundles, sees the price calculated automatically, and adds it to the cart. Unknown or malformed product ids show a "Product not found" page. The page title and share tags use the product name.
- **Cart (`/cart`)** — each line shows the product, selected tier, bundle quantity, derived pack count and line price. Quantities can be edited, lines removed or the whole cart cleared (with confirmation). Different tiers of the same product are separate lines; adding the same tier again merges into one line.
- **Cart stays in sync with the catalog** — the cart re-checks itself against the database on load, on window focus and when the cart page opens. If an admin changed a price or pack size, the line is updated and the customer is told (toast + dismissible banner). If a product or tier was deleted, the line is removed and the customer is told. If the check fails (for example, offline), nothing is changed or removed.
- Loading, error and empty states throughout; responsive from phone to desktop; prices always shown in **KWD with 3 decimals**.

### Admin side (`/admin`)
- Create, edit and delete **products**, **brands** and **categories**; each product belongs to one brand and one category.
- **Dynamic pricing-tier editor** — add or remove any number of tiers per product (no fixed slots).
- Validation: name, brand and category required; at least one tier; whole-number pack counts above 0; prices above 0; no duplicate pack counts within a product; image URL must be a valid http(s) URL. The Save button stays disabled until the form is valid. Blank brand/category names are rejected when adding and editing.
- A brand or category that is still used by products **cannot be deleted**; the admin is told how many products use it.
- Changes are saved to the database and appear on the storefront after a refresh.

---

## Pricing Rules

| Rule | Implementation |
| --- | --- |
| A tier is an independent offer: `units_per_bundle` + `bundle_price` | `pricing_tiers` table |
| Line total = **bundle price × bundle quantity** (not per pack) | `lineTotal()` in `src/lib/pricing.ts` |
| Internal pack quantity = `units_per_bundle × bundle quantity` (derived, not stored) | `packCount()` |
| Cart total sums line totals in integer fils (1 KWD = 1000 fils) to avoid float errors | `cartTotal()` |
| Different tiers of one product are separate cart lines (line key = tier id) | `addLine()` in `src/lib/cart.tsx` |
| Bundle quantity is always a whole number from 1 to 99 | `clampBundleQty()` |

**Worked example:** 2 × the 4-pack offer at 19.500 KWD → 8 packs internally, line total **39.000 KWD** (covered by an automated test).

---

## Data Model

```
brands          (id, name UNIQUE, created_at)
categories      (id, name UNIQUE, created_at)
products        (id, name, description, image_url,
                 brand_id    → brands(id)     ON DELETE RESTRICT,
                 category_id → categories(id) ON DELETE RESTRICT, created_at)
pricing_tiers   (id, product_id → products(id) ON DELETE CASCADE,
                 units_per_bundle integer CHECK (> 0),
                 bundle_price numeric(12,3) CHECK (> 0),
                 UNIQUE (product_id, units_per_bundle))
```

- **Money** is stored as `numeric(12,3)` (never floating point) and formatted to 3 decimals in the UI.
- **Deleting a product** cascades to its tiers (a tier has no meaning without its product). **Deleting a brand or category** that is in use is blocked (`RESTRICT`) instead of silently deleting products.
- **`save_product` (Postgres function)** saves a product and all its tiers in **one transaction**. It validates input, updates existing tiers by id, inserts new ones and deletes removed ones. Tier ids are preserved when a product is edited, so cart lines that reference them stay valid. A failed save changes nothing.
- Row-Level Security is enabled on all tables (see Known limitations about its policies).

### Seed Data (Initial Migration)

| Product | Brand | Category | Pricing tiers |
| --- | --- | --- | --- |
| Product A — Sterile Gauze Pads | MediCare | Wound Care | 1 pack: 2.250 KWD |
| Product B — Digital Thermometer | PureHealth | Diagnostics | 1 pack: 7.000 · 4 packs: 26.000 KWD |
| Product C — Nitrile Exam Gloves | PureHealth | Wound Care | 1 pack: 5.500 · 4 packs: 19.500 · 12 packs: 55.000 KWD |

*This is the initial seed. The live catalog can be changed from `/admin`.*

---

## Testing

### Running Automated Tests
```bash
npm test
```

**47 tests in 6 files** (46 unit tests + 1 database integration test):

| Area | What is covered |
| --- | --- |
| Pricing (`pricing.test.ts`) | 2 × 4-pack at 19.500 = 39.000 KWD and 8 packs; KWD formatting; separate tiers vs merged lines; quantity clamping (0, negative, decimals, NaN, empty, Infinity, 1000); corrupt cart data dropped on restore; integer-fils totals |
| Cart sync (`cart-sync.test.ts`) | Unchanged cart, price change, pack-size change, silent name/image change, deleted tier, mixed changes, empty cart, quantity preserved, idempotency, notice text |
| Catalog (`catalog.test.ts`) | Search (case-insensitive, trimmed), combined brand/category/search filters, sorting incl. unpriced products |
| Routing and metadata | Route matching; product page title and share tags |
| Database integration (`catalog.rpc.test.ts`) | `save_product` preserves tier ids when tiers are edited, and brands/categories in use cannot be deleted. **Runs against the hosted database**, so it needs network access and creates temporary rows. |

**Manual testing** was also done for: the 39.000 KWD example, three separate cart lines for Product C, quantity inputs (0, negatives, decimals, letters, 1000, empty), admin create/edit/delete with persistence after refresh, validation errors, blocked brand/category deletion, editing or deleting a product while it is in the cart, and layouts at phone width.