import Link from "next/link";

export default function NotFound() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-surface pt-24 pb-16">
      <div className="container-wide text-center max-w-lg">
        <p className="font-mono text-brand-accent font-bold tracking-widest text-sm mb-4">404</p>
        <h1 className="h2-section text-brand-dark justify-center">Page Not Found</h1>
        <p className="text-slate-600 mb-10">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link href="/" className="btn-primary px-10">
          BACK TO HOME
        </Link>
      </div>
    </section>
  );
}
