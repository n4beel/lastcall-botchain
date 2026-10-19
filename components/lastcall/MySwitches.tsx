"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatEther, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContracts } from "wagmi";
import Panel from "@/components/ui/Panel";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { lastcallAbi } from "@/lib/botchain/abi";
import { formatDuration, isClaimable, secondsUntilClaimable, type LastcallSwitch } from "@/lib/lastcall";

/**
 * Every switch the connected wallet owns or stands to inherit.
 *
 * The contract numbers switches globally and keeps no per-address index, but `Armed` indexes both
 * the owner and the beneficiary, so two filtered log queries find the whole set and one multicall
 * gets their current state. It matters more here than in most apps: a beneficiary is not
 * necessarily told their switch ID, and an owner who forgets to check in loses the deposit.
 */
type ArmedEvent = Extract<(typeof lastcallAbi)[number], { type: "event"; name: "Armed" }>;

/** Taken from the ABI itself; re-typing the signature here is how the two drift apart. */
const ARMED = lastcallAbi.find(
  (item): item is ArmedEvent => item.type === "event" && item.name === "Armed",
)!;

interface Row {
  id: bigint;
  s?: LastcallSwitch;
  role: "owner" | "beneficiary" | "both" | "";
}

export default function MySwitches() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient(); // stable-hook-result

  const [ids, setIds] = useState<bigint[] | null>(null);
  const [failed, setFailed] = useState(false);

  const ready = Boolean(address) && isBotChainId(chainId) && isDeployed(chainId);
  const deployment = isBotChainId(chainId) && isDeployed(chainId) ? getDeployment(chainId) : null;
  const contract = deployment?.address;
  const fromBlock = deployment?.deployBlock;

  const scanned = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !publicClient || !address || !contract || fromBlock === undefined) return;
    const key = `${chainId}:${address.toLowerCase()}`;
    if (scanned.current === key) return;
    scanned.current = key;

    let cancelled = false;
    void (async () => {
      try {
        const [owned, inherited] = await Promise.all([
          publicClient.getLogs({ address: contract, event: ARMED, args: { owner: address }, fromBlock }),
          publicClient.getLogs({ address: contract, event: ARMED, args: { beneficiary: address }, fromBlock }),
        ]);
        if (cancelled) return;

        const seen = new Set<string>();
        const found: bigint[] = [];
        for (const log of [...owned, ...inherited]) {
          const { id } = log.args;
          if (id === undefined || seen.has(id.toString())) continue;
          seen.add(id.toString());
          found.push(id);
        }
        found.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // newest first
        setIds(found);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, publicClient, address, contract, fromBlock, chainId]);

  const states = useReadContracts({
    contracts: (ids ?? []).map((id) => ({
      address: contract,
      abi: lastcallAbi,
      functionName: "switchOf" as const,
      args: [id] as const,
    })),
    query: { enabled: Boolean(ids?.length) && Boolean(contract) },
  });

  const rows: Row[] = useMemo(() => {
    if (!ids || !address) return [];
    const me = address.toLowerCase();
    return ids.map((id, i) => {
      const raw = states.data?.[i]?.result as
        | {
            owner: Address; interval: bigint; beneficiary: Address;
            lastCheckIn: bigint; closed: boolean; amount: bigint;
          }
        | undefined;
      if (!raw) return { id, role: "" as const };
      const s: LastcallSwitch = {
        owner: raw.owner,
        interval: Number(raw.interval),
        beneficiary: raw.beneficiary,
        lastCheckIn: Number(raw.lastCheckIn),
        closed: raw.closed,
        amount: raw.amount,
      };
      const owner = s.owner.toLowerCase() === me;
      const beneficiary = s.beneficiary.toLowerCase() === me;
      return {
        id,
        s,
        role: owner && beneficiary ? "both" : owner ? "owner" : beneficiary ? "beneficiary" : "",
      };
    });
  }, [ids, states.data, address]);

  if (!ready) return null;

  if (failed) {
    return (
      <Panel>
        <p className="text-xs text-zinc-400">
          Could not list your switches — the node refused the log query. Switches are still
          reachable by ID above.
        </p>
      </Panel>
    );
  }

  if (ids === null) {
    return (
      <Panel>
        <Spinner label="Finding your switches" />
      </Panel>
    );
  }

  if (ids.length === 0) {
    return (
      <Panel>
        <p className="text-xs text-zinc-400">
          No switches yet for this wallet, as owner or as beneficiary.
        </p>
      </Panel>
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);

  return (
    <Panel>
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">Your switches</h2>
        <p className="text-xs text-zinc-500">
          Everything this wallet owns or stands to inherit. A beneficiary is not told their ID by
          anyone, so this is the only way to find one.
        </p>

        <ul className="space-y-2 list-none p-0 m-0">
          {rows.map(({ id, s, role }) => {
            const claimable = s ? isClaimable(s, nowSec) : false;
            const remaining = s ? secondsUntilClaimable(s, nowSec) : 0;
            return (
              <li
                key={id.toString()}
                className="flex items-center gap-3 flex-wrap py-2 border-b border-zinc-800"
              >
                <Link href={`/switch/${id.toString()}`} className="font-mono text-sm text-emerald-400 underline">
                  #{id.toString()}
                </Link>

                <span className="font-mono text-xs text-zinc-300">
                  {s ? `${formatEther(s.amount)} BOT` : "…"}
                </span>

                <span className="text-[11px] uppercase tracking-wide text-zinc-500">{role}</span>

                <span className="ml-auto">
                  {s && (
                    <Badge variant={s.closed ? "default" : claimable ? "pending" : "confirmed"}>
                      {s.closed ? "Closed" : claimable ? "Claimable" : formatDuration(remaining)}
                    </Badge>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
