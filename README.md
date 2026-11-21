# MediShop — Medical E-Commerce with Multi-Tier Pricing

A full-stack medical supply e-commerce application built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and a real **PostgreSQL** database. 

It implements dynamic multi-tier volume pricing, cart calculations where bundle pricing is strictly per-bundle (not per-pack), an atomic product management admin panel, and an accessible medical-grade design system.

---

## 1. Live Deployment & Key Links

- **Live Application:** [https://medbasket-tiered-market.lovable.app](https://medbasket-tiered-market.lovable.app)
- **Admin Management:** [https://medbasket-tiered-market.lovable.app/admin](https://medbasket-tiered-market.lovable.app/admin)
- **Cart Page:** [https://medbasket-tiered-market.lovable.app/cart](https://medbasket-tiered-market.lovable.app/cart)
- **GitHub Repository:** [https://github.com/MennaEzzelarab/medsupply-market](https://github.com/MennaEzzelarab/medsupply-market)

---

## 2. Project Architecture & Scope

### Customer Experience
1. **Home / Storefront (`/`)**:
   - Filter products by Brand and Category.
   - Real-time search across names and descriptions with URL persistence (`?q=`).
   - Sorting options (Name A–Z, Price: Low to High, Price: High to Low based on lowest tier).
   - Radio-selectable tier options directly on product cards with instant "Add to Cart" and toast confirmation linking directly to `/cart`.

2. **Product Details (`/product/:id`)**:
   - Server-side prefetching with TanStack Start route loaders and query cache priming.
   - Dynamic meta tags (`<title>`, `og:title`, `og:image`, canonical link).
   - Interactive tier selection, live price computation, and quantity controls.
   - Graceful fallback for non-existent or invalid UUIDs without crashing.

3. **Shopping Cart (`/cart`)**:
   - Different tiers of the same product are tracked as **distinct line items**.
   - Displays both **customer bundle quantity** and derived **internal pack quantity** (`units_per_bundle × bundle_qty`).
   - Line total calculation: $\text{bundle\_price} \times \text{bundle\_qty}$ (bundle price is **not** per pack).
   - Robust quantity inputs: allows empty typing and auto-clamps on blur/Enter (1–99).
   - **Real-Time Catalog Sync**: Background query checks existing cart items against live catalog prices/tiers. Displays dismissible change banners and toast alerts if an admin alters pricing or removes a tier.
   - "Clear Cart" and item removals backed by accessible confirmation dialogs.
   - Cart totals computed in integer fils to eliminate floating-point rounding errors.

### Store Administration (`/admin`)
4. **Catalog & Tier Management**:
   - Full CRUD for Products, Brands, and Categories.
   - **Dynamic Pricing Tier Editor**: Add or remove any number of bundle tiers per product.
   - **Atomic Persistence**: Uses a PostgreSQL `save_product` RPC to validate and diff tiers in a single transaction (retains tier IDs, deletes removed tiers, rolls back cleanly on error).
   - **Referential Integrity**: Brands and categories are protected by `ON DELETE RESTRICT`; deleting a referenced brand/category warns the user with product usage counts rather than corrupting catalog data.
   - Destruction confirmations handled with styled `AlertDialog` components.

---

## 3. Seed Data Specification

The database is pre-seeded with the required test products across 2 brands and 2 categories:

| Product | Brand | Category | Available Pricing Tiers |
| :--- | :--- | :--- | :--- |
| **Product A — Sterile Gauze Pads** | MediCare | Wound Care | • 1 pack: **2.250 KWD** |
| **Product B — Digital Thermometer** | PureHealth | Diagnostics | • 1 pack: **7.000 KWD**<br>• 4 packs: **26.000 KWD** |
| **Product C — Nitrile Exam Gloves** | PureHealth | Wound Care | • 1 pack: **5.500 KWD**<br>• 4 packs: **19.500 KWD**<br>• 12 packs: **55.000 KWD** |

*All prices display in Kuwaiti Dinars (KWD) formatted to 3 decimal places.*

---

## 4. Tech Stack

- **Frontend:** React 19, TypeScript, TanStack Start v1 (SSR & file-based routing), TanStack Query v5.
- **Styling:** Tailwind CSS v4, Lucide Icons, shadcn/ui accessible components.
- **Theme Palette:** Medical Teal (`#0caca7` primary, `#087e7a` high-contrast text, `#e6f7f6` subtle background tint).
- **Backend & Database:** PostgreSQL via Lovable Cloud (Supabase engine) with Row-Level Security, strict foreign keys, CHECK constraints for positive prices/units, and custom atomic RPC functions.
- **Client State:** `localStorage` cart persistence with schema validation and sanitization on load.
- **Testing:** Vitest + React Testing Library (47 automated tests covering pricing math, catalog filtering/sorting, routing, metadata, and cart reconciliation).

---

## 5. AI Tools & Technologies Used

- **Lovable:** Primary AI-assisted full-stack development environment for initial scaffolding, database schema migrations, and rapid UI generation.
- **Google Antigravity:** AI coding assistant used for implementing custom business logic, test suites, real-time cart reconciliation, edge-case hardening, and assessment compliance reviews.

---

## 6. Known Limitations

- **Authentication:** In accordance with the assessment brief, user authentication and role-based access control were out of scope; the `/admin` dashboard is publicly accessible.
- **Image Uploads:** Product images are configured via direct image URLs rather than a dedicated multipart media storage bucket.
- **E-Commerce Checkout:** Order processing, inventory deduction, shipping, and payment gateway integrations were out of scope.
- **Offline RPC Test:** `src/lib/catalog.rpc.test.ts` connects directly to the live hosted PostgreSQL database to verify transaction rollback; running this test requires an active internet connection.

---

## 7. Local Setup & Running Tests

### Prerequisites
- Node.js 20+ or Bun installed.

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
Open `http://localhost:3000` in your browser.

### Running Automated Tests
```bash
npm test
```