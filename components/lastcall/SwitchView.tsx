"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatEther,
  type Hex,
} from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import BotChainGate from "@/components/botchain/BotChainGate";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import { isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, ZERO_ADDRESS } from "@/lib/botchain/deployment";
import { lastcallAbi } from "@/lib/botchain/abi";
import {
  formatDuration,
  isClaimable,
  secondsUntilClaimable,
  type LastcallSwitch,
} from "@/lib/lastcall";

interface SwitchViewProps {
  id: bigint;
}

export default function SwitchView({ id }: SwitchViewProps) {
  const chainId = useChainId();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;

  const {
    data: switchData,
    isLoading: isSwitchLoading,
    error: switchError,
    refetch: refetchSwitch,
  } = useReadContract({
    address: deployment?.address,
    abi: lastcallAbi,
    functionName: "switchOf",
    args: [id],
    query: { enabled: Boolean(deployment) },
  });

  const { data: timeRemainingData, refetch: refetchTime } = useReadContract({
    address: deployment?.address,
    abi: lastcallAbi,
    functionName: "timeUntilClaimable",
    args: [id],
    query: { enabled: Boolean(deployment) },
  });

  const [actionType, setActionType] = useState<"checkIn" | "withdraw" | "claim">("checkIn");
  const [stage, setStage] = useState<TxStage>("idle");
  const [hash, setHash] = useState<Hex | null>(null);

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  const settledHash = useRef<Hex | null>(null);

  useEffect(() => {
    if (!hash || settledHash.current === hash) return;
    if (!receipt.isSuccess && !receipt.isError) return;

    settledHash.current = hash;

    if (receipt.isSuccess) {
      setStage("confirmed");
      if (actionType === "checkIn") {
        toast("success", "Checked in", "Your timer has been reset to now.");
      } else if (actionType === "withdraw") {
        toast("success", "Funds withdrawn", "Your deposit has returned to your wallet.");
      } else {
        toast("success", "Claimed", "Funds have transferred to your beneficiary wallet.");
      }
      void refetchSwitch();
      void refetchTime();
    } else {
      setStage("failed");
      toast("error", "Action failed", "Transaction reverted. Check the explorer and try again.");
    }
  }, [hash, receipt.isSuccess, receipt.isError, actionType, refetchSwitch, refetchTime, toast]);

  if (isSwitchLoading) {
    return (
      <Panel>
        <p className="text-sm text-zinc-500 animate-pulse">Loading switch details...</p>
      </Panel>
    );
  }

  if (switchError || !switchData || switchData.owner === ZERO_ADDRESS) {
    return (
      <Panel>
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Switch #{id.toString()} not found.</p>
          <Link href="/switches">
            <Button variant="ghost">← Back to Lookup</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  const s: LastcallSwitch = {
    owner: switchData.owner,
    interval: Number(switchData.interval),
    beneficiary: switchData.beneficiary,
    lastCheckIn: Number(switchData.lastCheckIn),
    closed: switchData.closed,
    amount: switchData.amount,
  };

  const isOwner = address?.toLowerCase() === s.owner.toLowerCase();
  const isBeneficiary = address?.toLowerCase() === s.beneficiary.toLowerCase();

  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSec = timeRemainingData !== undefined ? Number(timeRemainingData) : secondsUntilClaimable(s, nowSec);
  const claimable = isClaimable(s, nowSec) || (remainingSec === 0 && !s.closed);

  const handleAction = async (type: "checkIn" | "withdraw" | "claim") => {
    if (!deployment || s.closed) return;
    setActionType(type);
    setStage("signing");
    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: lastcallAbi,
        functionName: type,
        args: [id],
      });
      setHash(txHash);
      setStage("pending");
      toast("info", "Transaction submitted", "Confirming on chain...");
    } catch (err) {
      setStage("failed");
      if (err instanceof BaseError) {
        const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
        if (revert instanceof ContractFunctionRevertedError) {
          toast("error", "Action rejected", revert.data?.errorName ?? revert.message);
          return;
        }
      }
      toast("error", "Action cancelled", err instanceof Error ? err.message : "Reverted");
    }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Switch #{id.toString()}</h2>
          <Badge variant={s.closed ? "default" : claimable ? "pending" : "confirmed"}>
            {s.closed ? "Closed" : claimable ? "Claimable" : "Active"}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800 space-y-1">
              <span className="text-zinc-500 block uppercase font-medium">Owner</span>
              <span className="text-zinc-200 font-mono break-all">{s.owner}</span>
              {isOwner && <span className="inline-block text-emerald-400 font-semibold mt-1">(You)</span>}
            </div>

            <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800 space-y-1">
              <span className="text-zinc-500 block uppercase font-medium">Beneficiary</span>
              <span className="text-zinc-200 font-mono break-all">{s.beneficiary}</span>
              {isBeneficiary && <span className="inline-block text-indigo-400 font-semibold mt-1">(You)</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-b border-zinc-800 py-3">
            <div>
              <span className="text-zinc-500 block">Deposit</span>
              <span className="text-sm font-semibold text-white">{formatEther(s.amount)} BOT</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Check-in Window</span>
              <span className="text-sm text-zinc-300">{(s.interval / 3600).toFixed(0)}h</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Last Check-in</span>
              <span className="text-xs text-zinc-400">{new Date(s.lastCheckIn * 1000).toLocaleTimeString()}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Time to Claim</span>
              <span className={`text-sm font-semibold ${claimable && !s.closed ? "text-amber-400" : "text-emerald-400"}`}>
                {s.closed ? "Closed" : formatDuration(remainingSec)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded border border-zinc-900 text-xs text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-300">Whoever acts first wins</p>
            <p>
              Even if the timer runs out, the owner can still withdraw as long as the beneficiary has not claimed. Once either withdraws or claims, the switch closes.
            </p>
          </div>
        </div>
      </Panel>

      <BotChainGate noWalletNote="Connect wallet to check in, withdraw, or claim.">
        <Panel>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Controls</h3>

            <TxStatus stage={stage} hash={hash} />

            {s.closed ? (
              <p className="text-xs text-zinc-500">This switch is closed. No further actions can be taken.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {isOwner && (
                  <>
                    <Button
                      onClick={() => handleAction("checkIn")}
                      disabled={stage === "signing" || stage === "pending"}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      {stage === "signing" && actionType === "checkIn" ? "Checking in..." : "Check In (Reset Timer)"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleAction("withdraw")}
                      disabled={stage === "signing" || stage === "pending"}
                    >
                      {stage === "signing" && actionType === "withdraw" ? "Withdrawing..." : "Withdraw Funds"}
                    </Button>
                  </>
                )}

                {isBeneficiary && (
                  <Button
                    onClick={() => handleAction("claim")}
                    disabled={!claimable || stage === "signing" || stage === "pending"}
                    className="bg-indigo-600 hover:bg-indigo-500"
                  >
                    {stage === "signing" && actionType === "claim"
                      ? "Claiming..."
                      : claimable
                      ? "Claim Funds Now"
                      : `Claimable in ${formatDuration(remainingSec)}`}
                  </Button>
                )}

                {!isOwner && !isBeneficiary && (
                  <p className="text-xs text-zinc-400">
                    Your connected wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) is neither the owner nor the beneficiary of this switch.
                  </p>
                )}
              </div>
            )}
          </div>
        </Panel>
      </BotChainGate>
    </div>
  );
}
