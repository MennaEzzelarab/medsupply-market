<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Catalog data is read/written from the browser via the generated client with React Query (src/lib/catalog.ts); cart lives in localStorage via CartProvider (src/lib/cart.tsx) because there are no user accounts.
- Pricing math lives in src/lib/pricing.ts so totals are consistent and tested.
- Normalize bundle quantities at every cart boundary and validate restored lines; keep cart input drafts local until blur to prevent corrupt persistence.
- Save products and tier diffs through the security-invoker save_product RPC, preserving tier IDs and using a deferrable pack-count uniqueness constraint so all edits succeed or roll back together.
- Restrict brand/category deletion while referenced, and check usage before deleting so catalog products cannot be removed accidentally.
- Detail routes fetch in a route loader that primes the Query cache with ensureQueryData and returns the row, so head() can title the page and its share tags from loaderData; resolve malformed ids to null (a not-found page) rather than a query error.
