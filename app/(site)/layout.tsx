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
      {/* pb clears the fixed mobile action bar; lg drops it. */}
      <div className="relative z-1 pb-[92px] lg:pb-0">
        <main className="min-h-screen">{children}</main>
        <Footer />
      </div>
      <WhatsAppButton />
      <MobileActionBar />
    </>
  );
}
