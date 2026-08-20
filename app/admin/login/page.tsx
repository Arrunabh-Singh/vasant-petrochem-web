import { signInWithGoogle } from "@/app/actions/auth";
import { site } from "@/app/content";

// audit.md H2 / I-18: distinct messages per error branch confirmed the
// admin's email to anyone who tried signing in — one generic message for
// every failure mode instead.
const GENERIC_ERROR = "Sign-in failed. If you are the administrator, contact support.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? GENERIC_ERROR : null;

  return (
    <section className="min-h-screen flex items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="font-serif text-2xl font-bold text-brand-dark mb-1">Admin Login</h1>
        <p className="text-slate-500 text-sm mb-8">{site.name}</p>

        {message && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-6">{message}</p>
        )}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg px-4 py-3 font-bold text-sm text-slate-700 hover:border-brand hover:bg-slate-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>
    </section>
  );
}
