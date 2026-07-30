import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Reinigungsfirma Pieterlen | HEXA CLEAN",
  description:
    "Professionelle Reinigung in Pieterlen: Wohnungen, Häuser, Büros, Liegenschaften, Fenster und Umzugsreinigungen.",
  alternates: {
    canonical: "/reinigungsfirma-pieterlen",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Reinigungsfirma Pieterlen"
      title="Zuverlässige Reinigung direkt in Pieterlen"
      intro="HEXA CLEAN bietet professionelle Reinigungs- und Hauswartungsdienste in Pieterlen sowie in Biel/Bienne und der umliegenden Region."
      serviceName="Reinigungsfirma Pieterlen"
      locationName="Pieterlen"
      benefits={[
        "Kurze Wege innerhalb der Region",
        "Flexible Terminvereinbarung",
        "Privatkunden, Verwaltungen und Unternehmen",
        "Reinigung und kleine Hauswartungsarbeiten",
      ]}
      sections={[
        {
          title: "Reinigungsservice für Pieterlen",
          text: "Wir reinigen Wohnungen, Häuser, Büros, Eingangsbereiche, Treppenhäuser und weitere zugängliche Objektbereiche. Die Arbeiten werden vorher klar vereinbart und sorgfältig ausgeführt.",
        },
        {
          title: "Persönlicher Kontakt und klare Abläufe",
          text: "Bei HEXA CLEAN erhalten Sie direkte Ansprechpartner, nachvollziehbare Absprachen und eine auf den Auftrag abgestimmte Offerte.",
        },
        {
          title: "Auch für umliegende Gemeinden",
          text: "Neben Pieterlen führen wir Einsätze unter anderem in Biel/Bienne, Nidau, Brügg, Lyss, Grenchen und Meinisberg aus.",
        },
      ]}
      faq={[
        {
          question: "Arbeitet HEXA CLEAN direkt in Pieterlen?",
          answer: "Ja. Pieterlen gehört zum zentralen Einsatzgebiet von HEXA CLEAN.",
        },
        {
          question: "Kann ich eine einmalige Reinigung buchen?",
          answer: "Ja. Sowohl einmalige als auch wiederkehrende Reinigungen können angefragt werden.",
        },
        {
          question: "Bietet HEXA CLEAN auch Hauswartung an?",
          answer: "Ja. Neben Reinigung sind kleinere Hauswartungsarbeiten und Objektkontrollen nach Vereinbarung möglich.",
        },
      ]}
    />
  );
}