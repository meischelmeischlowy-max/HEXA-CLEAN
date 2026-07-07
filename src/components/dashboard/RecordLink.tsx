import Link from "next/link";

type RecordLinkProps = {
  href?: string | null;
  label: string;
  value?: string | number | null;
};

export default function RecordLink({ href, label, value }: RecordLinkProps) {
  if (!href || !value) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-sm text-neutral-400">{label}</p>
        <p className="mt-1 text-sm text-neutral-500">Keine Daten</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-800 bg-neutral-950 p-4 transition hover:border-cyan-500 hover:bg-neutral-900"
    >
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-cyan-400">
        {value}
      </p>
    </Link>
  );
}