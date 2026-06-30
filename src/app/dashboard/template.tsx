import type { ReactNode } from "react";
import DashboardScreenSaver from "../../components/dashboard/DashboardScreenSaver";

export default function DashboardTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <DashboardScreenSaver />
    </>
  );
}