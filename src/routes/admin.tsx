import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, brandsQuery, categoriesQuery, type Product, type Named } from "@/lib/catalog";
import { formatKWD } from "@/lib/pricing";
import { Loading, ErrorState, Empty } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — MediShop" },
      { name: "description", content: "Manage products, brands, categories and pricing tiers." },
      { property: "og:title", content: "Admin — MediShop" },
      { property: "og:description", content: "Manage products, brands, categories and pricing tiers." },
    ],
  }),
  component: Admin,
});

const errMsg = (e: unknown) => (e as any)?.message ?? "Something went wrong";

function Admin() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <Tabs defaultValue="products">
        <TabsList className="rounded-full"><TabsTrigger value="products" className="rounded-full">Products</TabsTrigger><TabsTrigger value="brands" className="rounded-full">Brands</TabsTrigger><TabsTrigger value="categories" className="rounded-full">Categories</TabsTrigger></TabsList>
        <TabsContent value="products" className="mt-6"><ProductsAdmin /></TabsContent>
        <TabsContent value="brands" className="mt-6"><NamedAdmin table="brands" label="brand" /></TabsContent>
        <TabsContent value="categories" className="mt-6"><NamedAdmin table="categories" label="category" /></TabsContent>
      </Tabs>
    </div>
  );
}

function NamedAdmin({ table, label }: { table: "brands" | "categories"; label: string }) {
  const qc = useQueryClient();
  const q = useQuery(table === "brands" ? brandsQuery : categoriesQuery);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Named | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: [table] }); qc.invalidateQueries({ queryKey: ["products"] }); };

  async function run(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(ok); refresh();
  }

  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; run(() => supabase.from(table).insert({ name: name.trim() }), `Added ${label}`).then(() => setName("")); }}>
        <Input placeholder={`New ${label} name`} value={name} onChange={(e) => setName(e.target.value)} className="rounded-full" />
        <Button disabled={busy} className="rounded-full"><Plus className="h-4 w-4" />Add</Button>
      </form>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} /> : !q.data?.length ? <Empty title={`No ${label} entries yet`} /> :
        <ul className="divide-y rounded-3xl border bg-card">
          {q.data.map((i) => (
            <li key={i.id} className="flex items-center gap-2 p-3">
              {editing?.id === i.id ? <>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="flex-1" />
                <Button size="sm" disabled={busy} onClick={() => run(() => supabase.from(table).update({ name: editing.name.trim() }).eq("id", i.id), "Saved").then(() => setEditing(null))}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </> : <>
                <span className="flex-1 font-medium">{i.name}</span>
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(i)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { if (confirm(`Delete "${i.name}"? Products using it will also be deleted.`)) run(() => supabase.from(table).delete().eq("id", i.id), "Deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </>}
            </li>
          ))}
        </ul>}
    </div>
  );
}

type TierDraft = { units_per_bundle: string; bundle_price: string };
type Draft = { id?: string; name: string; description: string; image_url: string; brand_id: string; category_id: string; tiers: TierDraft[] };
const emptyDraft = (): Draft => ({ name: "", description: "", image_url: "", brand_id: "", category_id: "", tiers: [{ units_per_bundle: "1", bundle_price: "" }] });

function ProductsAdmin() {
  const qc = useQueryClient();
  const q = useQuery(productsQuery);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function del(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Product deleted"); qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-4">
      <Button className="rounded-full" onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" />New product</Button>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} /> : !q.data?.length ? <Empty title="No products yet" /> :
        <ul className="divide-y rounded-3xl border bg-card">
          {q.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.brand?.name} · {p.category?.name} · {p.pricing_tiers.map((t) => `${t.units_per_bundle}× ${formatKWD(t.bundle_price)}`).join(" / ") || "no tiers"}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setDraft({ id: p.id, name: p.name, description: p.description, image_url: p.image_url, brand_id: p.brand_id, category_id: p.category_id, tiers: p.pricing_tiers.map((t) => ({ units_per_bundle: String(t.units_per_bundle), bundle_price: t.bundle_price.toFixed(3) })) })}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => del(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>}
      {draft && <ProductDialog draft={draft} setDraft={setDraft} />}
    </div>
  );
}

function ProductDialog({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft | null) => void }) {
  const qc = useQueryClient();
  const brands = useQuery(brandsQuery);
  const cats = useQuery(categoriesQuery);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setTier = (i: number, patch: Partial<TierDraft>) => set({ tiers: draft.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const sel = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  async function save() {
    if (!draft.name.trim() || !draft.brand_id || !draft.category_id) { toast.error("Name, brand and category are required"); return; }
    const tiers = draft.tiers.map((t) => ({ units_per_bundle: Number(t.units_per_bundle), bundle_price: Number(t.bundle_price) }));
    if (tiers.some((t) => !Number.isInteger(t.units_per_bundle) || t.units_per_bundle <= 0 || !(t.bundle_price > 0))) { toast.error("Each tier needs a whole number of packs and a price above 0"); return; }
    if (new Set(tiers.map((t) => t.units_per_bundle)).size !== tiers.length) { toast.error("Each tier must have a different pack count"); return; }
    setSaving(true);
    try {
      const row = { name: draft.name.trim(), description: draft.description, image_url: draft.image_url, brand_id: draft.brand_id, category_id: draft.category_id };
      let id = draft.id;
      if (id) {
        const { error } = await supabase.from("products").update(row).eq("id", id); if (error) throw error;
        const { error: e2 } = await supabase.from("pricing_tiers").delete().eq("product_id", id); if (e2) throw e2;
      } else {
        const { data, error } = await supabase.from("products").insert(row).select("id").single(); if (error) throw error;
        id = data.id;
      }
      if (tiers.length) { const { error } = await supabase.from("pricing_tiers").insert(tiers.map((t) => ({ ...t, product_id: id! }))); if (error) throw error; }
      toast.success("Product saved"); qc.invalidateQueries({ queryKey: ["products"] }); setDraft(null);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader><DialogTitle>{draft.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Name</Label><Input value={draft.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} /></div>
          <div className="space-y-1"><Label>Image URL</Label><Input value={draft.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Brand</Label><select className={sel} value={draft.brand_id} onChange={(e) => set({ brand_id: e.target.value })}><option value="">Select…</option>{brands.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div className="space-y-1"><Label>Category</Label><select className={sel} value={draft.category_id} onChange={(e) => set({ category_id: e.target.value })}><option value="">Select…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="space-y-2">
            <Label>Pricing tiers</Label>
            {draft.tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-2xl bg-muted p-2">
                <Input type="number" min={1} step={1} value={t.units_per_bundle} onChange={(e) => setTier(i, { units_per_bundle: e.target.value })} aria-label="Packs per bundle" className="bg-background" />
                <span className="text-xs text-muted-foreground">packs</span>
                <Input type="number" min={0.001} step={0.001} value={t.bundle_price} onChange={(e) => setTier(i, { bundle_price: e.target.value })} aria-label="Bundle price" placeholder="0.000" className="bg-background" />
                <span className="text-xs text-muted-foreground">KWD</span>
                <Button size="icon" variant="ghost" aria-label="Remove tier" onClick={() => set({ tiers: draft.tiers.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => set({ tiers: [...draft.tiers, { units_per_bundle: "", bundle_price: "" }] })}><Plus className="h-4 w-4" />Add tier</Button>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={saving} onClick={save} className="rounded-full">{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
