import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesPreview } from "@/components/home/ServicesPreview";
import { CtaSection } from "@/components/home/CtaSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      <Navbar />
      <main>
        <HeroSection />
        <ServicesPreview />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
