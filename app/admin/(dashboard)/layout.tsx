import Image from "next/image";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import AdminNav from "@/app/components/admin/AdminNav";

/**
 * Two rows on purpose. Identity and sign-out sit on the top row, outside the
 * nav's scroll container, so they can never be pushed off-screen by the
 * section links — which is exactly what used to happen once the twelve links
 * outgrew the header (they overflowed even at 1440px). The sections
 * themselves live in AdminNav's own scrollable rail below.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-brand-dark">
        <div className="container-wide flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-9 h-9 shrink-0">
              <Image src="/vasant_logo.png" alt="Vasant Petrochem" fill className="object-contain" />
            </div>
            <span className="font-serif font-bold text-white text-lg">Admin</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-slate-400 hidden md:block truncate max-w-[220px]">
              {user?.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 text-slate-300 hover:text-brand-accent transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={18} />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                  Sign out
                </span>
              </button>
            </form>
          </div>
        </div>
        <div className="container-wide !px-0">
          <AdminNav />
        </div>
      </header>
      <main className="container-wide py-10">{children}</main>
    </div>
  );
}
