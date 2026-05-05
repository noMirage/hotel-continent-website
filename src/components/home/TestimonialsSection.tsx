import { Star } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FadeIn } from "@/components/ui/FadeIn";

const testimonialKeys = ["1", "2", "3", "4"] as const;

export function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <FadeIn className="text-center mb-12">
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">
            {t("testimonials.eyebrow")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("testimonials.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonialKeys.map((key, i) => (
            <FadeIn key={key} delay={i * 100} direction="up">
              <div className="bg-background rounded-2xl border border-border p-6 md:p-8 hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-foreground leading-relaxed mb-6 flex-1 italic">
                  "{t(`testimonials.${key}.text` as any)}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {t(`testimonials.${key}.name` as any).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {t(`testimonials.${key}.name` as any)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`testimonials.${key}.role` as any)}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
