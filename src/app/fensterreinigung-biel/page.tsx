import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Fensterreinigung Biel | Streifenfreie Glasflächen",
  description:
    "Professionelle Fensterreinigung in Biel/Bienne für Wohnungen, Häuser, Büros und Geschäftsflächen.",
  alternates: {
    canonical: "/fensterreinigung-biel",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Fensterreinigung Biel"
      title="Professionelle Fensterreinigung in Biel/Bienne"
      intro="HEXA CLEAN reinigt zugängliche Fenster, Glasflächen und Rahmen gründlich für einen gepflegten und klaren Eindruck."
      serviceName="Fensterreinigung Biel"
      locationName="Biel/Bienne"
      benefits={[
        "Fenster innen und aussen nach Absprache",
        "Reinigung zugänglicher Glasflächen",
        "Rahmenreinigung nach vereinbartem Umfang",
        "Für Privat- und Geschäftskunden",
      ]}
      sections={[
        {
          title: "Klare Fenster für Wohnung und Geschäft",
          text: "Wir reinigen Fenster und zugängliche Glasflächen in Wohnungen, Häusern, Büros und Geschäftsräumen.",
        },
        {
          title: "Individuelle Berechnung nach Fensterzahl",
          text: "Fenstergrösse, Anzahl, Zugänglichkeit, Rahmen und Verschmutzung beeinflussen den Aufwand und werden bei der Offerte berücksichtigt.",
        },
        {
          title: "Auch als Zusatzleistung möglich",
          text: "Fensterreinigung kann einzeln oder zusammen mit einer Grund-, Büro- oder Umzugsreinigung angefragt werden.",
        },
      ]}
      faq={[
        {
          question: "Werden Fenster innen und aussen gereinigt?",
          answer: "Das hängt vom vereinbarten Auftrag und von der sicheren Zugänglichkeit ab.",
        },
        {
          question: "Werden auch Rahmen gereinigt?",
          answer: "Rahmen können in den Leistungsumfang aufgenommen werden und werden in der Offerte berücksichtigt.",
        },
        {
          question: "Kann Fensterreinigung mit einer Umzugsreinigung kombiniert werden?",
          answer: "Ja. Fensterreinigung kann als Zusatzleistung zu einer Umzugs- oder Grundreinigung vereinbart werden.",
        },
      ]}
    />
  );
}