import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ContactPage() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { data: hotelSettings, address: enAddress, phone, email } = useHotelSettings();

  const address = language === "uk" && hotelSettings?.address_uk
    ? hotelSettings.address_uk
    : enAddress;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: t("contact.sent"),
      description: t("contact.sentDesc"),
    });
    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end overflow-hidden">
        <img
          src="/leisure/hero.webp"
          alt="Carpathian landscape"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/30 to-transparent" />
        <div className="relative container mx-auto px-4 pb-10">
          <FadeIn direction="up">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
              {t("contact.title")}
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl">{t("contact.subtitle")}</p>
          </FadeIn>
        </div>
      </section>
      
      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-6">
                  {t("contact.getInTouch")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("contact.description")}
                </p>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t("footer.address")}</h3>
                      <p className="text-muted-foreground">{address}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t("footer.phone")}</h3>
                      <a href={`tel:${phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {phone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t("footer.email")}</h3>
                      <a href={`mailto:${email}`} className="text-muted-foreground hover:text-primary transition-colors">
                        {email}
                      </a>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t("footer.frontDesk")}</h3>
                      <p className="text-muted-foreground">{t("footer.frontDeskHours")}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                    {t("contact.sendMessage")}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("contact.name")} *</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t("contact.namePlaceholder")} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("contact.email")} *</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t("contact.subject")} *</Label>
                      <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} placeholder={t("contact.subjectPlaceholder")} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t("contact.message")} *</Label>
                      <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder={t("contact.messagePlaceholder")} rows={5} required />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("contact.sending")}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {t("contact.send")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="h-80 md:h-[420px] w-full">
        <iframe
          title="Hotel Continent location"
          src="https://maps.google.com/maps?q=Готель+Континент+вулиця+Сонячна+59+Поляна+Закарпаття&output=embed&z=15"
          className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-500"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </div>
  );
}
