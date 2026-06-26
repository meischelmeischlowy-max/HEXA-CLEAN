import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services/Services";
import BeforeAfter from "@/components/BeforeAfter";
import QuickOffer from "@/components/QuickOffer";
import ServiceArea from "@/components/ServiceArea";
import AIChatLauncher from "@/components/AIChat/AIChatLauncher";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020711] text-white">
      <Preloader />

      <Navbar />

      <Hero />

      <Services />

      <BeforeAfter />

      <QuickOffer />

      <AIChatLauncher />

      <ServiceArea />

      <Footer />
    </main>
  );
}