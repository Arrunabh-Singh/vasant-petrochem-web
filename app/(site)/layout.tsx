import AmbientBackground from "../components/AmbientBackground";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileActionBar from "../components/MobileActionBar";
import WhatsAppButton from "../components/WhatsAppButton";

// The footer prints the current year. Pages that are otherwise static would
// freeze the build-time year, so re-render at least daily (VP-LEG-006).
export const revalidate = 86400;

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
