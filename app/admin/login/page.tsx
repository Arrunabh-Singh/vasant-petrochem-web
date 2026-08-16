"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { site } from "@/app/content";

const initialState: SignInState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <section className="min-h-screen flex items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <h1 className="font-serif text-2xl font-bold text-brand-dark mb-1">Admin Login</h1>
        <p className="text-slate-500 text-sm mb-8">{site.name}</p>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-bold text-brand uppercase tracking-widest">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="username"
              className="w-full mt-1 border border-slate-200 rounded-lg px-4 py-3 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-bold text-brand uppercase tracking-widest">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full mt-1 border border-slate-200 rounded-lg px-4 py-3 focus:border-brand outline-none"
            />
          </div>
          {state.error && <p className="text-red-600 text-sm">{state.error}</p>}
          <button type="submit" disabled={pending} className="w-full btn-primary justify-center disabled:opacity-60">
            {pending ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </section>
  );
}
