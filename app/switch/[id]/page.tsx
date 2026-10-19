import PageShell from "@/components/layout/PageShell";
import SwitchView from "@/components/lastcall/SwitchView";
import { NAV } from "@/lib/nav";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SwitchPage({ params }: PageProps) {
  const { id } = await params;
  const switchId = BigInt(id);

  return (
    <PageShell
      nav={NAV}
      title={`Switch #${id}`}
      description={`Dead man's switch #${id} status and controls on BOT Chain`}
    >
      <SwitchView id={switchId} />
    </PageShell>
  );
}
