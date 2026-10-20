"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  parseEther,
  parseEventLogs,
  type Hex,
} from "viem";
import { useAccount, useChainId, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import BotChainGate from "@/components/botchain/BotChainGate";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import { activeBotChain, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, ZERO_ADDRESS } from "@/lib/botchain/deployment";
import { lastcallAbi } from "@/lib/botchain/abi";
import { MIN_INTERVAL } from "@/lib/lastcall";


// The chain's own symbol. Hardcoding "BOT" labelled every testnet amount as mainnet
// currency, which is the confusion the network badge exists to prevent.
const SYMBOL = activeBotChain.nativeCurrency.symbol;

export default function ArmForm() {
  return (
    <BotChainGate noWalletNote="Arming a dead man's switch requires connecting a native BOT Chain wallet.">
      <ArmFormInner />
    </BotChainGate>
  );
}

function ArmFormInner() {
  const chainId = useChainId();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [beneficiary, setBeneficiary] = useState("");
  const [intervalHours, setIntervalHours] = useState("24");
  const [amount, setAmount] = useState("1");

  const [stage, setStage] = useState<TxStage>("idle");
  const [hash, setHash] = useState<Hex | null>(null);
  const [createdId, setCreatedId] = useState<bigint | null>(null);

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;

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
      toast("success", "Switch armed", "Dead man's switch is now live on chain.");

      if (receipt.data?.logs) {
        try {
          const logs = parseEventLogs({
            abi: lastcallAbi,
            eventName: "Armed",
            logs: receipt.data.logs,
          });
          if (logs.length > 0 && logs[0].args?.id !== undefined) {
            setCreatedId(logs[0].args.id);
          }
        } catch {
          // ignore
        }
      }
    } else {
      setStage("failed");
      toast("error", "Arming failed", "Transaction reverted. Check the explorer and try again.");
    }
  }, [hash, receipt.isSuccess, receipt.isError, receipt.data, toast]);

  const trimmedBeneficiary = beneficiary.trim();
  const beneficiaryValid =
    isAddress(trimmedBeneficiary) &&
    trimmedBeneficiary.toLowerCase() !== ZERO_ADDRESS.toLowerCase() &&
    trimmedBeneficiary.toLowerCase() !== address?.toLowerCase();

  const hoursNum = parseFloat(intervalHours);
  // Checked on the seconds that are sent, not the hours that were typed — the contract's bound is
  // MIN_INTERVAL = 1 hours expressed in seconds, and flooring sits between the two.
  const intervalSecondsNum = Number.isFinite(hoursNum) ? Math.floor(hoursNum * 3600) : NaN;
  const intervalValid =
    Number.isFinite(intervalSecondsNum) && intervalSecondsNum >= MIN_INTERVAL;

  const amountNum = parseFloat(amount);
  const amountValid = !isNaN(amountNum) && amountNum > 0;

  const handleArm = useCallback(async () => {
    if (!beneficiaryValid || !intervalValid || !amountValid || !deployment || !isBotChainId(chainId)) return;

    const intervalSeconds = BigInt(intervalSecondsNum);
    const valueWei = parseEther(amount.trim());

    setStage("signing");
    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: lastcallAbi,
        functionName: "arm",
        args: [trimmedBeneficiary as Hex, intervalSeconds],
        value: valueWei,
      });
      setHash(txHash);
      setStage("pending");
      toast("info", "Switch submitted", "Funding and arming switch on BOT Chain...");
    } catch (err) {
      setStage("failed");
      if (err instanceof BaseError) {
        const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
        if (revert instanceof ContractFunctionRevertedError) {
          toast("error", "Arming rejected", revert.data?.errorName ?? revert.message);
          return;
        }
      }
      toast("error", "Submission cancelled", err instanceof Error ? err.message : "Reverted");
    }
  }, [beneficiaryValid, intervalValid, amountValid, deployment, chainId, intervalSecondsNum, amount, trimmedBeneficiary, writeContractAsync, toast]);

  if (stage === "confirmed") {
    return (
      <Panel>
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Switch Armed</h2>
          <p className="text-sm text-zinc-300">
            Your dead man&apos;s switch is funded and armed. Keep check-in on schedule to maintain control.
          </p>

          {createdId !== null && (
            <div className="p-4 bg-zinc-900/60 rounded border border-zinc-800 space-y-2">
              <span className="text-xs text-zinc-500 block">Switch #{createdId.toString()}</span>
              <p className="text-xs text-zinc-300">
                Beneficiary: <span className="font-mono">{trimmedBeneficiary}</span>
              </p>
              <p className="text-xs text-zinc-300">
                Check-in interval: {intervalHours} hours
              </p>
              <div className="pt-2">
                <Link href={`/switch/${createdId.toString()}`}>
                  <Button>View Switch Dashboard →</Button>
                </Link>
              </div>
            </div>
          )}

          <TxStatus stage={stage} hash={hash} />

          <Button
            variant="ghost"
            onClick={() => {
              setBeneficiary("");
              setIntervalHours("24");
              setAmount("1");
              setStage("idle");
              setHash(null);
              setCreatedId(null);
              settledHash.current = null;
            }}
          >
            Arm Another Switch
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">Arm Dead Man&apos;s Switch</h2>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Beneficiary Address
          </label>
          <Input
            type="text"
            placeholder="0x..."
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Check-In Interval (hours, minimum 1)
          </label>
          <Input
            type="number"
            min="1"
            step="1"
            value={intervalHours}
            onChange={(e) => setIntervalHours(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Deposit Amount (BOT)
          </label>
          <Input
            type="text"
            placeholder="1.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded text-xs text-amber-300 space-y-1">
          <p className="font-semibold text-amber-200">Whoever acts first wins:</p>
          <p>• If you don&apos;t check in within {intervalHours || "X"} hours, the beneficiary can claim the deposit.</p>
          <p>• You can ALWAYS withdraw your funds — even after the interval has lapsed, provided the beneficiary hasn&apos;t claimed yet.</p>
        </div>

        <TxStatus stage={stage} hash={hash} />

        <Button
          onClick={handleArm}
          disabled={!beneficiaryValid || !intervalValid || !amountValid || stage === "signing" || stage === "pending"}
          className="w-full"
        >
          {stage === "signing" ? "Confirming in Wallet..." : stage === "pending" ? "Arming Switch..." : `Arm Switch with ${amount || "0"} ${SYMBOL}`}
        </Button>
      </div>
    </Panel>
  );
}
