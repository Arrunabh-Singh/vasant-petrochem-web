import Features from "./components/Features";
import Hero from "./components/Hero";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
    </main>
  );
}