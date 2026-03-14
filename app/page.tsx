import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TrustBar from "./components/TrustBar";
import Features from "./components/Features";
import Infrastructure from "./components/Infrastructure";
import Products from "./components/Products";
import Industries from "./components/Industries";
import Certifications from "./components/Certifications";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <Infrastructure />
      <Products />
      <Industries />
      <Certifications />
      <Contact />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}
