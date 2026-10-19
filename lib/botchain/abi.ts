export const lastcallAbi = [
  {
    type: "function",
    name: "arm",
    stateMutability: "payable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "interval", type: "uint64" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "checkIn",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "switchOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "interval", type: "uint64" },
          { name: "beneficiary", type: "address" },
          { name: "lastCheckIn", type: "uint64" },
          { name: "closed", type: "bool" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "timeUntilClaimable",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MIN_INTERVAL",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "event",
    name: "Armed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "interval", type: "uint64", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CheckedIn",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "newLastCheckIn", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "error",
    name: "ZeroValue",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "BeneficiaryIsOwner",
    inputs: [],
  },
  {
    type: "error",
    name: "IntervalTooShort",
    inputs: [
      { name: "interval", type: "uint64" },
      { name: "min", type: "uint64" },
    ],
  },
  {
    type: "error",
    name: "NotFound",
    inputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "error",
    name: "NotBeneficiary",
    inputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "error",
    name: "AlreadyClosed",
    inputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "error",
    name: "NotYetClaimable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "claimableAt", type: "uint64" },
    ],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
] as const;

export const contractAbi = lastcallAbi;
