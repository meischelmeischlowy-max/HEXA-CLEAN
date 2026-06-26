type SummaryCardProps = {
  service: string;
  area?: number;
  windows?: number;
  floor?: string;
  elevator?: boolean;
  oven?: boolean;
  balcony?: boolean;
  frequency?: string;
  description?: string;
  date?: string;
  priceRange: string;
};

export default function SummaryCard({
  service,
  area,
  windows,
  floor,
  elevator,
  oven,
  balcony,
  frequency,
  description,
  date,
  priceRange,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

      <h3 className="text-xl font-bold mb-5">
        📋 Zusammenfassung
      </h3>

      <div className="space-y-3 text-sm">

        <Row title="Dienstleistung" value={service} />

        {area && (
          <Row title="Fläche" value={`${area} m²`} />
        )}

        {windows !== undefined && (
          <Row title="Fenster" value={String(windows)} />
        )}

        {floor && (
          <Row title="Etage" value={floor} />
        )}

        {elevator !== undefined && (
          <Row
            title="Lift"
            value={elevator ? "Ja" : "Nein"}
          />
        )}

        {oven !== undefined && (
          <Row
            title="Backofen"
            value={oven ? "Ja" : "Nein"}
          />
        )}

        {balcony !== undefined && (
          <Row
            title="Balkon"
            value={balcony ? "Ja" : "Nein"}
          />
        )}

        {frequency && (
          <Row
            title="Rhythmus"
            value={frequency}
          />
        )}

        {description && (
          <Row
            title="Beschreibung"
            value={description}
          />
        )}

        {date && (
          <Row
            title="Termin"
            value={date}
          />
        )}

      </div>

      <div className="mt-6 rounded-xl bg-emerald-50 p-4">

        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Richtpreis
        </div>

        <div className="mt-2 text-2xl font-bold text-emerald-700">
          {priceRange}
        </div>

      </div>

    </div>
  );
}

function Row({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-6 border-b border-zinc-100 pb-2">
      <span className="text-zinc-500">
        {title}
      </span>

      <span className="font-medium text-right">
        {value}
      </span>
    </div>
  );
}