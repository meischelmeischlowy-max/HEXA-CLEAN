import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Unterhaltsreinigung Biel | Regelmässige Reinigung",
  description:
    "Regelmässige Unterhaltsreinigung für Büros, Liegenschaften und gemeinschaftliche Bereiche in Biel/Bienne und Umgebung.",
  alternates: {
    canonical: "/unterhaltsreinigung-biel",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Unterhaltsreinigung Biel"
      title="Regelmässige Unterhaltsreinigung in Biel/Bienne"
      intro="Mit einer individuell geplanten Unterhaltsreinigung bleiben Büros, Treppenhäuser, Eingangsbereiche und weitere Flächen dauerhaft sauber und gepflegt."
      serviceName="Unterhaltsreinigung Biel"
      locationName="Biel/Bienne"
      benefits={[
        "Planbare wiederkehrende Einsätze",
        "Individuell abgestimmter Leistungsumfang",
        "Saubere Sanitär- und Oberflächenbereiche",
        "Geeignet für Büros und Liegenschaften",
      ]}
      sections={[
        {
          title: "Was gehört zur Unterhaltsreinigung?",
          text: "Je nach Vereinbarung reinigen wir Böden, Oberflächen, Sanitärbereiche, Eingänge, Treppenhäuser und weitere regelmässig genutzte Bereiche.",
        },
        {
          title: "Passender Rhythmus für Ihr Objekt",
          text: "Der Reinigungsrhythmus kann wöchentlich, zweiwöchentlich, monatlich oder nach einem individuell vereinbarten Plan erfolgen.",
        },
        {
          title: "Kontinuität und gepflegter Eindruck",
          text: "Regelmässige Reinigung reduziert starke Verschmutzungen und sorgt dafür, dass Kunden, Mitarbeitende und Bewohner gepflegte Räume vorfinden.",
        },
      ]}
      faq={[
        {
          question: "Wie oft kann die Unterhaltsreinigung erfolgen?",
          answer: "Der Rhythmus richtet sich nach Nutzung und Objekt. Möglich sind unter anderem wöchentliche, zweiwöchentliche oder monatliche Einsätze.",
        },
        {
          question: "Werden Reinigungsmittel mitgebracht?",
          answer: "Die benötigte Ausstattung und Vorgehensweise werden vor dem Auftrag vereinbart.",
        },
        {
          question: "Ist die Unterhaltsreinigung auch für Treppenhäuser geeignet?",
          answer: "Ja. Treppenhäuser, Eingänge und gemeinschaftlich genutzte Bereiche können Bestandteil des vereinbarten Leistungsumfangs sein.",
        },
      ]}
    />
  );
}