import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Reinigungsfirma Nidau | Professionelle Reinigung",
  description:
    "HEXA CLEAN bietet professionelle Reinigung in Nidau für Wohnungen, Büros, Liegenschaften, Fenster und Umzüge.",
  alternates: {
    canonical: "/reinigungsfirma-nidau",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Reinigungsfirma Nidau"
      title="Professionelle Reinigungsfirma für Nidau"
      intro="HEXA CLEAN unterstützt Privatkunden, Unternehmen und Verwaltungen in Nidau mit sorgfältigen und individuell abgestimmten Reinigungsleistungen."
      serviceName="Reinigungsfirma Nidau"
      locationName="Nidau"
      benefits={[
        "Reinigung für Wohnungen und Häuser",
        "Büro- und Unterhaltsreinigung",
        "Fenster- und Umzugsreinigung",
        "Individuelle Offerte nach Prüfung",
      ]}
      sections={[
        {
          title: "Reinigung für private und geschäftliche Objekte",
          text: "Wir übernehmen vereinbarte Reinigungsarbeiten in Wohnungen, Häusern, Büros, Eingangsbereichen und gemeinschaftlich genutzten Flächen.",
        },
        {
          title: "Flexible Einsätze in Nidau",
          text: "Je nach Bedarf sind einmalige oder wiederkehrende Reinigungen möglich. Umfang und Rhythmus werden individuell abgestimmt.",
        },
        {
          title: "Regional rund um Biel erreichbar",
          text: "Nidau gehört zu unserem Einsatzgebiet rund um Biel/Bienne, Pieterlen und die angrenzenden Gemeinden.",
        },
      ]}
      faq={[
        {
          question: "Welche Reinigungen bietet HEXA CLEAN in Nidau an?",
          answer: "Möglich sind unter anderem Wohnungsreinigung, Büroreinigung, Unterhaltsreinigung, Fensterreinigung und Umzugsreinigung.",
        },
        {
          question: "Sind regelmässige Einsätze möglich?",
          answer: "Ja. Der Rhythmus wird passend zu Objekt und Nutzung vereinbart.",
        },
        {
          question: "Wie erhalte ich eine Offerte?",
          answer: "Senden Sie die Angaben über die Schnellofferte. Danach prüfen wir den Auftrag persönlich.",
        },
      ]}
    />
  );
}