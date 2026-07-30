import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Reinigungsfirma Grenchen | Reinigung & Hauswartung",
  description:
    "Professionelle Reinigung in Grenchen für Wohnungen, Büros, Liegenschaften, Fenster und Umzüge.",
  alternates: {
    canonical: "/reinigungsfirma-grenchen",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Reinigungsfirma Grenchen"
      title="Zuverlässige Reinigungsleistungen in Grenchen"
      intro="HEXA CLEAN bietet professionelle Reinigung für Privatkunden, Unternehmen und Verwaltungen in Grenchen und Umgebung."
      serviceName="Reinigungsfirma Grenchen"
      locationName="Grenchen"
      benefits={[
        "Reinigung für Wohnungen und Büros",
        "Grund- und Unterhaltsreinigung",
        "Fenster- und Umzugsreinigung",
        "Transparente Anfrage und Offerte",
      ]}
      sections={[
        {
          title: "Reinigung für Grenchen und Umgebung",
          text: "Wir übernehmen vereinbarte Reinigungsarbeiten in privaten und gewerblichen Objekten.",
        },
        {
          title: "Klare und zuverlässige Ausführung",
          text: "Leistungsumfang und Ablauf werden vor dem Einsatz nachvollziehbar vereinbart.",
        },
        {
          title: "Preis nach Objekt und Aufwand",
          text: "Fläche, Zustand und Zusatzleistungen bestimmen den Aufwand und werden individuell geprüft.",
        },
      ]}
      faq={[
        {
          question: "Ist Grenchen Teil des Einsatzgebiets?",
          answer: "Ja. Einsätze in Grenchen können abhängig von Termin und Auftragsumfang angefragt werden.",
        },
        {
          question: "Bietet HEXA CLEAN Umzugsreinigung an?",
          answer: "Ja. Umzugs- und Endreinigungen können individuell angefragt werden.",
        },
        {
          question: "Sind auch Geschäftskunden möglich?",
          answer: "Ja. Büro- und Geschäftsflächen können nach Vereinbarung gereinigt werden.",
        },
      ]}
    />
  );
}