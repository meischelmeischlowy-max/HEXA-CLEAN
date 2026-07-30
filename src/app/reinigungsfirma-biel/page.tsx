import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Reinigungsfirma Biel | Professionelle Reinigung",
  description:
    "HEXA CLEAN ist Ihre Reinigungsfirma für Biel/Bienne und Umgebung. Reinigung für Wohnungen, Büros, Liegenschaften und Umzüge.",
  alternates: {
    canonical: "/reinigungsfirma-biel",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Reinigungsfirma Biel/Bienne"
      title="Professionelle Reinigungsfirma in Biel und Umgebung"
      intro="HEXA CLEAN unterstützt Privatkunden, Unternehmen und Verwaltungen mit zuverlässiger Reinigung in Biel/Bienne, Pieterlen und der umliegenden Region."
      serviceName="Reinigungsfirma Biel"
      locationName="Biel/Bienne"
      benefits={[
        "Reinigung für Privat- und Geschäftskunden",
        "Einmalige oder regelmässige Einsätze",
        "Persönliche und direkte Kommunikation",
        "Unverbindliche Preisorientierung online",
      ]}
      sections={[
        {
          title: "Reinigung für Wohnungen, Häuser und Unternehmen",
          text: "Wir übernehmen unterschiedliche Reinigungsarbeiten in Wohnungen, Häusern, Büros und gemeinschaftlich genutzten Bereichen. Umfang und Rhythmus werden passend zum Objekt und zum tatsächlichen Bedarf vereinbart.",
        },
        {
          title: "Individuelle Offerte statt unklarer Pauschalen",
          text: "Fläche, Zustand, Zimmerzahl, Zusatzleistungen und Einsatzrhythmus beeinflussen den Aufwand. Deshalb erstellen wir zunächst eine realistische Preisorientierung und prüfen die Angaben anschliessend persönlich.",
        },
        {
          title: "Regional in Biel/Bienne erreichbar",
          text: "Unser Einsatzgebiet umfasst Biel/Bienne, Pieterlen, Nidau, Brügg, Lyss, Grenchen und weitere Orte in der Umgebung.",
        },
      ]}
      faq={[
        {
          question: "Welche Reinigungsarbeiten bietet HEXA CLEAN in Biel an?",
          answer: "Zum Angebot gehören unter anderem Gebäude- und Unterhaltsreinigung, Büroreinigung, Fensterreinigung, Umzugsreinigung sowie individuell vereinbarte Reinigungsarbeiten.",
        },
        {
          question: "Sind auch regelmässige Einsätze möglich?",
          answer: "Ja. Je nach Objekt sind einmalige, wöchentliche, zweiwöchentliche oder monatliche Einsätze möglich.",
        },
        {
          question: "Wie erhalte ich eine Offerte?",
          answer: "Nutzen Sie die Schnellofferte auf dieser Seite. Nach Prüfung Ihrer Angaben melden wir uns persönlich bei Ihnen.",
        },
      ]}
    />
  );
}