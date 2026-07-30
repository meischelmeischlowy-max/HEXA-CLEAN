import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Umzugsreinigung Biel | Gründliche Endreinigung",
  description:
    "Umzugs- und Endreinigung für Wohnungen und Häuser in Biel/Bienne und Umgebung. Individuelle Offerte nach Objektprüfung.",
  alternates: {
    canonical: "/umzugsreinigung-biel",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Umzugsreinigung Biel"
      title="Gründliche Umzugsreinigung in Biel/Bienne"
      intro="Wir übernehmen die Reinigung von Wohnungen und Häusern vor der Übergabe oder nach einem Umzug – abgestimmt auf Zustand, Grösse und vereinbarte Leistungen."
      serviceName="Umzugsreinigung Biel"
      locationName="Biel/Bienne"
      benefits={[
        "Reinigung von Küche, Bad und Wohnräumen",
        "Fenster und Zusatzleistungen nach Absprache",
        "Individuelle Beurteilung des Aufwands",
        "Klare Offerte vor Ausführung",
      ]}
      sections={[
        {
          title: "Endreinigung vor Wohnungsübergabe",
          text: "Bei der Umzugsreinigung werden die vereinbarten Räume und Flächen gründlich gereinigt. Dazu können Küche, Bad, Böden, Oberflächen und Fenster gehören.",
        },
        {
          title: "Aufwand hängt vom tatsächlichen Zustand ab",
          text: "Grösse, Verschmutzung, Ausstattung, Fensterzahl und Zusatzleistungen bestimmen den Aufwand. Deshalb wird jede Anfrage individuell beurteilt.",
        },
        {
          title: "Frühzeitig Termin anfragen",
          text: "Für einen gewünschten Übergabetermin empfiehlt sich eine möglichst frühe Anfrage, damit Umfang und Verfügbarkeit rechtzeitig geklärt werden können.",
        },
      ]}
      faq={[
        {
          question: "Ist Fensterreinigung enthalten?",
          answer: "Fenster können als Bestandteil oder Zusatzleistung vereinbart werden. Der genaue Umfang wird in der Offerte festgehalten.",
        },
        {
          question: "Gibt es einen festen Pauschalpreis?",
          answer: "Der Preis richtet sich nach Fläche, Zustand und Leistungsumfang. Nach Prüfung erhalten Sie eine individuelle Offerte.",
        },
        {
          question: "Wie früh sollte ich anfragen?",
          answer: "Je früher der gewünschte Zeitraum bekannt ist, desto besser können Termin und Umfang geplant werden.",
        },
      ]}
    />
  );
}