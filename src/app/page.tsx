import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services/Services";
import BeforeAfter from "@/components/BeforeAfter";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import QuickOffer from "@/components/QuickOffer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020711] text-white">
      <Preloader />
      <Navbar />
      <Hero />
      <Services />
      <BeforeAfter />
      <CTA />
      <QuickOffer />
      <Footer />
    </main>
  );
}