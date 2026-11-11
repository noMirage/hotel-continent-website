import { useState, useRef } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedRoomsSection } from "@/components/home/FeaturedRoomsSection";
import { AmenitiesSection } from "@/components/home/AmenitiesSection";
import { PromotionsSection } from "@/components/home/PromotionsSection";
import { InvestmentSection } from "@/components/home/InvestmentSection";
import { CTASection } from "@/components/home/CTASection";
import { GallerySection } from "@/components/home/GallerySection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { AvailabilityResultsSection } from "@/components/home/AvailabilityResultsSection";
import { GroupBookingSection } from "@/components/home/GroupBookingSection";
import { BanquetPromoBlock } from "@/components/BanquetPromoBlock";
import { FadeIn } from "@/components/ui/FadeIn";
import type { SearchParams } from "@/components/home/AvailabilitySearchWidget";

const Index = () => {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleSearch(params: SearchParams) {
    setSearchParams(params);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  return (
    <>
      <HeroSection onSearch={handleSearch} />

      {searchParams && (
        <div ref={resultsRef}>
          <AvailabilityResultsSection
            params={searchParams}
            onReset={() => setSearchParams(null)}
          />
        </div>
      )}

      <FadeIn><FeaturedRoomsSection /></FadeIn>
      <FadeIn><PromotionsSection /></FadeIn>
      <FadeIn><BanquetPromoBlock /></FadeIn>
      <FadeIn><GroupBookingSection /></FadeIn>
      <FadeIn><AmenitiesSection /></FadeIn>
      <FadeIn><GallerySection /></FadeIn>
      <FadeIn><TestimonialsSection /></FadeIn>
      {/* <FadeIn><InvestmentSection /></FadeIn> */}
      <FadeIn><CTASection /></FadeIn>
    </>
  );
};

export default Index;
