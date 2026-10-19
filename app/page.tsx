import PageShell from "@/components/layout/PageShell";
import { NAV } from "@/lib/nav";
import { app } from "@/lib/app-config";
import ArmForm from "@/components/lastcall/ArmForm";

export default function Home() {
  return (
    <PageShell nav={NAV} title={app.name} description={app.tagline}>
      <ArmForm />
    </PageShell>
  );
}
