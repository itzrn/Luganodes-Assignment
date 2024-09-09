# Ethereum (ETH) Deposit Tracker

## Objective

The goal of this project is to develop a robust and efficient Ethereum Deposit Tracker that monitors and records ETH deposits on the Beacon Deposit Contract.

## Examples of Deposits

- **Normal Transaction:** `0x1391be19259f10e01336a383217cf35344dd7aa157e95030f46235448ef5e5d6`
- **Internal Transaction:** `0x53c98c3371014fd54275ebc90a6e42dffa2eee427915cab5f80f1e3e9c64eba4`

## Schema of Deposit

```typescript
Deposit {
    blockNumber: number;
    blockTimestamp: number;
    fee?: number;
    hash?: string;
    pubkey: string;
}
```