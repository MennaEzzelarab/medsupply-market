import { X, Info } from "lucide-react";
import { useCart } from "@/lib/cart";
import { describeChange } from "@/lib/cart-sync";
import { Button } from "@/components/ui/button";

export function CartNotices() {
  const { notices, dismissNotices, syncError } = useCart();

  if (notices.length === 0 && !syncError) {
    return null;
  }

  return (
    <div className="space-y-2">
      {syncError && (
        <p className="text-xs text-muted-foreground" role="status">
          Couldn't check for price updates right now
        </p>
      )}
      {notices.length > 0 && (
        <div
          role="status"
          className="relative flex items-start justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-tint p-4 text-sm"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-deep" />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-primary-deep">Cart updates</p>
              <ul className="space-y-1 text-xs text-foreground sm:text-sm">
                {notices.map((n, i) => (
                  <li key={`${n.type}-${n.tierId}-${i}`} className="leading-relaxed">
                    {describeChange(n)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
            onClick={dismissNotices}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

