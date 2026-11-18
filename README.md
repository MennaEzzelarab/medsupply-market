# MedSupply Market

Build a medical e-commerce app with React + TypeScript + Tailwind, using a real Postgres backend. Tables: brands, categories, products (name, description, image_url, brand_id, category_id), pricing_tiers (product_id, units_per_bundle, bundle_price) with ON DELETE CASCADE and CHECK constraints for positive values. Pages: (1) Home/product listing with brand and category lists that filter products, showing each product’s image, name and all pricing tiers, with a link to details and an add-to-cart option. (2) Product details page with info, brand, category and all tiers; user picks a tier and bundle quantity, price is calculated automatically, then add to cart. (3) Cart where each line shows product, selected tier, bundle quantity and line price; allow quantity update and removal; different tiers of the same product are separate lines; line total = bundle_price × bundle quantity (bundle price is NOT per pack); internal pack quantity = units_per_bundle × bundle quantity. (4) /admin for CRUD on products, brands, categories and a dynamic pricing-tier editor (any number of tiers). All prices display in KWD with 3 decimals. Include loading, error and empty states and a responsive layout. Seed 3 products: A with 1 tier (1 pack), B with 2 tiers (1/4 packs), C with 3 tiers (1/4/12 packs at 5.500/19.500/55.000 KWD), across 2 brands and 2 categories.

Theme: primary color #0caca7 (teal), clean medical look, lots of white space, rounded cards. Use dark text on primary-colored buttons for contrast, a darker teal (#087e7a) for teal text on white, and a light teal tint (#e6f7f6) for backgrounds.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/05c25fcc-49f2-45c4-be08-4f71ff187979).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
