import type { ReactNode } from "react";

export type DashboardTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  className?: string;
};

type DashboardTableProps<T> = {
  columns: DashboardTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  empty?: ReactNode;
};

export default function DashboardTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
}: DashboardTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/60">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 ${
                    column.className ?? ""
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className="group transition hover:bg-white/[0.04]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`border-b border-white/5 px-5 py-4 align-middle text-sm text-zinc-300 last:border-b-0 ${
                        column.className ?? ""
                      }`}
                    >
                      {column.render(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8">
                  {empty ?? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                      <p className="text-sm font-bold text-white">
                        Keine Daten
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Daten werden hier angezeigt, sobald die ersten Einträge
                        vorhanden sind.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}