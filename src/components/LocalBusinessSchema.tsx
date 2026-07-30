export default function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CleaningService",
    "@id": "https://hexaclean.ch/#business",
    name: "HEXA CLEAN",
    url: "https://hexaclean.ch",
    telephone: "+41 77 952 95 82",
    email: "info@hexaclean.ch",
    description:
      "Professionelle Reinigung, Hauswartung, Fensterreinigung, Umzugsreinigung und Kleinreparaturen in Pieterlen, Biel/Bienne und Umgebung.",
    image: "https://hexaclean.ch/apple-touch-icon.png",
    logo: "https://hexaclean.ch/apple-touch-icon.png",
    priceRange: "$$",
    areaServed: [
      {
        "@type": "City",
        name: "Pieterlen",
      },
      {
        "@type": "City",
        name: "Biel/Bienne",
      },
      {
        "@type": "City",
        name: "Nidau",
      },
      {
        "@type": "City",
        name: "Brügg",
      },
      {
        "@type": "City",
        name: "Lyss",
      },
      {
        "@type": "City",
        name: "Grenchen",
      },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+41 77 952 95 82",
      contactType: "customer service",
      availableLanguage: ["de", "pl"],
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}