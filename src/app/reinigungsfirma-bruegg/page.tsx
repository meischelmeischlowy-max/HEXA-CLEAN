import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Reinigungsfirma Brügg | Reinigung bei Biel",
  description:
    "Zuverlässige Reinigung in Brügg bei Biel für Privatkunden, Büros, Liegenschaften, Fenster und Umzüge.",
  alternates: {
    canonical: "/reinigungsfirma-bruegg",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Reinigungsfirma Brügg"
      title="Zuverlässige Reinigung in Brügg bei Biel"
      intro="HEXA CLEAN bietet sorgfältige Reinigungsleistungen für Privatkunden, Unternehmen und Verwaltungen in Brügg und der Region Biel."
      serviceName="Reinigungsfirma Brügg"
      locationName="Brügg"
      benefits={[
        "Reinigung für Privat- und Geschäftskunden",
        "Einmalige und wiederkehrende Einsätze",
        "Direkte Kommunikation",
        "Individuell abgestimmter Leistungsumfang",
      ]}
      sections={[
        {
          title: "Reinigungsservice in Brügg",
          text: "Wir reinigen Wohnungen, Häuser, Büros, Treppenhäuser, Eingangsbereiche und weitere vereinbarte Flächen.",
        },
        {
          title: "Leistungen nach tatsächlichem Bedarf",
          text: "Umfang, Reinigungsrhythmus und Zusatzleistungen werden passend zum Objekt festgelegt.",
        },
        {
          title: "Kurze Wege in der Region",
          text: "Brügg liegt innerhalb unseres regionalen Einsatzgebiets rund um Biel/Bienne, Nidau und Pieterlen.",
        },
      ]}
      faq={[
        {
          question: "Führt HEXA CLEAN Reinigungen in Brügg aus?",
          answer: "Ja. Brügg gehört zu unserem regionalen Einsatzgebiet.",
        },
        {
          question: "Kann ich eine Büroreinigung anfragen?",
          answer: "Ja. Büroflächen und vereinbarte Gemeinschaftsbereiche können gereinigt werden.",
        },
        {
          question: "Ist eine unverbindliche Anfrage möglich?",
          answer: "Ja. Nutzen Sie dafür die Schnellofferte auf dieser Seite.",
        },
      ]}
    />
  );
}