"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="min-h-dvh flex items-center justify-center bg-surface pt-24 pb-16">
      <div className="container-wide text-center max-w-lg">
        <p className="font-mono text-brand-accent font-bold tracking-widest text-sm mb-4">ERROR</p>
        <h1 className="h2-section text-brand-dark justify-center">Something Went Wrong</h1>
        <p className="text-slate-600 mb-10">
          An unexpected error occurred. Please try again, or contact us if the problem persists.
        </p>
        <button onClick={reset} className="btn-solid px-10">
          TRY AGAIN
        </button>
      </div>
    </section>
  );
}
