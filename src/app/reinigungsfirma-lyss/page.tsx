import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Reinigungsfirma Lyss | Professionelle Reinigung",
  description:
    "Professionelle Reinigung in Lyss für Wohnungen, Häuser, Büros, Liegenschaften, Fenster und Umzüge.",
  alternates: {
    canonical: "/reinigungsfirma-lyss",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Reinigungsfirma Lyss"
      title="Professionelle Reinigungsfirma in Lyss"
      intro="HEXA CLEAN übernimmt Reinigungsarbeiten für private und geschäftliche Objekte in Lyss und der umliegenden Region."
      serviceName="Reinigungsfirma Lyss"
      locationName="Lyss"
      benefits={[
        "Wohnungs- und Hausreinigung",
        "Büro- und Geschäftsreinigung",
        "Umzugs- und Fensterreinigung",
        "Klare Absprachen vor dem Einsatz",
      ]}
      sections={[
        {
          title: "Reinigung für unterschiedliche Objekte",
          text: "Wir unterstützen bei der Reinigung von Wohnungen, Häusern, Büros, Geschäftsflächen und gemeinschaftlich genutzten Bereichen.",
        },
        {
          title: "Einmalige oder regelmässige Reinigung",
          text: "Je nach Bedarf können einzelne Grundreinigungen oder planbare wiederkehrende Einsätze vereinbart werden.",
        },
        {
          title: "Individuelle Offerte",
          text: "Fläche, Zustand und Leistungsumfang beeinflussen den Aufwand. Deshalb prüfen wir jede Anfrage individuell.",
        },
      ]}
      faq={[
        {
          question: "Welche Objekte reinigt HEXA CLEAN in Lyss?",
          answer: "Anfragen sind für Wohnungen, Häuser, Büros, Geschäftsflächen und Liegenschaftsbereiche möglich.",
        },
        {
          question: "Kann Fensterreinigung ergänzt werden?",
          answer: "Ja. Fensterreinigung kann einzeln oder als Zusatzleistung vereinbart werden.",
        },
        {
          question: "Sind wiederkehrende Einsätze möglich?",
          answer: "Ja. Der Reinigungsrhythmus wird individuell festgelegt.",
        },
      ]}
    />
  );
}