import { Link } from "@tanstack/react-router";
import { ShoppingCart, Cross } from "lucide-react";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.bundleQty, 0);
  const nav = "rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary-deep sm:px-3";
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-primary-deep">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Cross className="h-4 w-4" /></span>
          MediShop
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/" className={nav} activeOptions={{ exact: true }} activeProps={{ className: "text-primary-deep" }}>Shop</Link>
          <Link to="/admin" className={nav} activeProps={{ className: "text-primary-deep" }}>Admin</Link>
          <Link to="/cart" className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:ml-2 sm:gap-2 sm:px-4">
            <ShoppingCart className="h-4 w-4" /> Cart{count > 0 && <span className="rounded-full bg-background px-2 text-xs text-primary-deep">{count}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
