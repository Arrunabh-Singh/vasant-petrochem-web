import AmbientBackground from "../components/AmbientBackground";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileActionBar from "../components/MobileActionBar";
import WhatsAppButton from "../components/WhatsAppButton";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <div className="relative z-1 pb-action-bar">
        <main className="min-h-dvh">{children}</main>
        <Footer />
      </div>
      <WhatsAppButton />
      <MobileActionBar />
    </>
  );
}
