"use client";

import { useState } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MySwitches from "@/components/lastcall/MySwitches";
import { NAV } from "@/lib/nav";

export default function SwitchesPage() {
  const [switchIdInput, setSwitchIdInput] = useState("");

  return (
    <PageShell
      nav={NAV}
      title="Switch Lookup"
      description="Inspect or manage an existing dead man's switch."
    >
      <div className="space-y-6">
        {/* Yours first. A beneficiary is never told their switch ID by anyone. */}
        <MySwitches />

        <Panel>
          <div className="space-y-4 max-w-md">
            <h2 className="text-base font-semibold text-white">Find a Switch</h2>
            <p className="text-xs text-zinc-400">
              Enter a switch ID to check in, withdraw your deposit, or claim funds as the beneficiary.
            </p>

            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Switch ID (e.g. 1)"
                value={switchIdInput}
                onChange={(e) => setSwitchIdInput(e.target.value)}
              />
              <Link href={switchIdInput.trim() ? `/switch/${switchIdInput.trim()}` : "#"}>
                <Button disabled={!switchIdInput.trim()}>View Switch →</Button>
              </Link>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="space-y-3 text-xs text-zinc-400">
            <h3 className="font-semibold text-zinc-200">How Lastcall Works</h3>
            <p>
              • <strong>Regular Check-Ins:</strong> As owner, calling <code>checkIn</code> updates <code>lastCheckIn</code> to the current block timestamp and resets the interval.
            </p>
            <p>
              • <strong>Unconditional Withdrawal:</strong> The owner can withdraw funds at any time, even after the interval lapses, as long as the beneficiary has not claimed first.
            </p>
            <p>
              • <strong>Beneficiary Claim:</strong> Once <code>lastCheckIn + interval</code> passes without a check-in or withdrawal, the beneficiary can claim the deposit.
            </p>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
