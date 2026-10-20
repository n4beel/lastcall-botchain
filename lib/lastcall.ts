import type { Address } from "viem";

export type LastcallSwitch = {
  owner: Address;
  interval: number;      // seconds
  beneficiary: Address;
  lastCheckIn: number;   // unix timestamp
  closed: boolean;
  amount: bigint;
};

export function claimableAt(s: LastcallSwitch): number {
  return s.lastCheckIn + s.interval;
}

export function isClaimable(s: LastcallSwitch, now?: number): boolean {
  const t = now ?? Math.floor(Date.now() / 1000);
  return !s.closed && t >= claimableAt(s);
}

export function secondsUntilClaimable(s: LastcallSwitch, now?: number): number {
  const t = now ?? Math.floor(Date.now() / 1000);
  return Math.max(0, claimableAt(s) - t);
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "claimable now";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

/**
 * Lastcall.sol declares `MIN_INTERVAL = 1 hours`. Here in the unit the contract is actually
 * given, because the arm form validates seconds and the two must not drift — see
 * lib/__tests__/contract-limits.
 */
export const MIN_INTERVAL = 3600;
