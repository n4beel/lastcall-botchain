"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MySwitches from "@/components/lastcall/MySwitches";
import { NAV } from "@/lib/nav";

/**
 * Your switches, and anyone else's by number.
 *
 * The lookup stays — unlike a list of every proposal or every piece, this list is only what *you*
 * own or stand to inherit, so a switch someone has told you about is genuinely unreachable without
 * it. It is a one-line field under the list rather than a panel of its own, because it is the
 * exception and not the way in. The page also carried an explainer repeating what each switch
 * already says on its own page; that is gone.
 */
export default function SwitchesPage() {
  const [id, setId] = useState("");
  const router = useRouter();
  const trimmed = id.trim();

  return (
    <PageShell
      nav={NAV}
      title="Switches"
      description="Everything this wallet owns or stands to inherit."
    >
      <div className="space-y-5">
        <MySwitches />

        <form
          className="flex gap-2 items-end max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) router.push(`/switch/${trimmed}`);
          }}
        >
          <div className="flex-1">
            <Input
              type="number"
              min="1"
              label="Open another switch"
              placeholder="Switch number"
              value={id}
              onChange={(e) => setId(e.target.value)}
              hint="Anyone's, by number. No wallet needed to read one."
            />
          </div>
          <Button type="submit" disabled={!trimmed} variant="ghost">
            Open
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
