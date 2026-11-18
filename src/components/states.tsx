import { Loader2, AlertCircle, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary-deep" />{label}</div>;
}
export function ErrorState({ error }: { error: unknown }) {
  return <div role="alert" className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive"><AlertCircle className="h-5 w-5" />{error instanceof Error ? error.message : (error as any)?.message ?? "Something went wrong."}</div>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary-tint px-6 py-16 text-center"><PackageOpen className="h-10 w-10 text-primary-deep" /><p className="font-semibold">{title}</p>{children}</div>;
}
