import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

const links = [
  { name: "Leads", href: "/admin" },
  { name: "Products", href: "/admin/products" },
  { name: "TDS Requests", href: "/admin/tds-requests" },
  { name: "Shipments", href: "/admin/logistics/shipments" },
  { name: "Vehicles", href: "/admin/logistics/vehicles" },
  { name: "Sanctions", href: "/admin/logistics/sanctions" },
  { name: "Benchmarks", href: "/admin/market/benchmarks" },
  { name: "Tally", href: "/admin/accounts/tally" },
  { name: "Documents", href: "/admin/documents" },
  { name: "Compliance", href: "/admin/compliance" },
  { name: "Approvals", href: "/admin/approvals" },
  { name: "Security", href: "/admin/security" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-dark border-b border-white/10">
        <div className="container-wide flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10">
              <Image src="/vasant_logo.png" alt="Vasant Petrochem" fill className="object-contain" />
            </div>
            <span className="font-serif font-bold text-white text-lg hidden sm:block">Admin</span>
          </div>
          <nav className="flex items-center gap-6">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-brand-accent transition-colors">
                {l.name}
              </Link>
            ))}
            <span className="text-xs text-slate-400 hidden md:block">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-slate-300 hover:text-brand-accent transition-colors" aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="container-wide py-10">{children}</main>
    </div>
  );
}
