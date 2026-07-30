import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

export const metadata: Metadata = {
  title: "Büroreinigung Biel | Saubere Geschäftsräume",
  description:
    "Professionelle Büroreinigung in Biel/Bienne. Saubere Arbeitsplätze, Böden, Oberflächen und Sanitärbereiche.",
  alternates: {
    canonical: "/bueroreinigung-biel",
  },
};

export default function Page() {
  return (
    <SeoLandingPage
      eyebrow="Büroreinigung Biel"
      title="Professionelle Büroreinigung in Biel/Bienne"
      intro="HEXA CLEAN sorgt für gepflegte Büroräume, saubere Arbeitsbereiche und einen professionellen Eindruck bei Mitarbeitenden und Kunden."
      serviceName="Büroreinigung Biel"
      locationName="Biel/Bienne"
      benefits={[
        "Reinigung von Büros und Geschäftsflächen",
        "Flexible Einsatzzeiten nach Absprache",
        "Böden, Oberflächen und Sanitärbereiche",
        "Einmalige oder wiederkehrende Reinigung",
      ]}
      sections={[
        {
          title: "Saubere Arbeitsplätze und Geschäftsflächen",
          text: "Wir reinigen zugängliche Arbeitsflächen, Böden, Eingangsbereiche, Sanitärbereiche und weitere vereinbarte Bereiche Ihres Büros.",
        },
        {
          title: "Reinigung passend zu Ihrem Betriebsablauf",
          text: "Einsatzzeiten und Reinigungsrhythmus werden so geplant, dass der normale Arbeitsablauf möglichst wenig beeinträchtigt wird.",
        },
        {
          title: "Professioneller erster Eindruck",
          text: "Ein gepflegtes Büro wirkt positiv auf Kunden und Mitarbeitende und unterstützt eine angenehme Arbeitsumgebung.",
        },
      ]}
      faq={[
        {
          question: "Ist Büroreinigung ausserhalb der Arbeitszeit möglich?",
          answer: "Mögliche Einsatzzeiten werden individuell abgestimmt und hängen von Verfügbarkeit und Objekt ab.",
        },
        {
          question: "Können Sanitärbereiche eingeschlossen werden?",
          answer: "Ja. Sanitär- und Gemeinschaftsbereiche können in den Leistungsumfang aufgenommen werden.",
        },
        {
          question: "Sind regelmässige Büroreinigungen möglich?",
          answer: "Ja. Wiederkehrende Einsätze können passend zur Nutzung des Büros geplant werden.",
        },
      ]}
    />
  );
}