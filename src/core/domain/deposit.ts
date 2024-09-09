import { z } from "zod";
export const DepositSchema = z.object({
  blockNumber: z.number(),
  blockTimestamp: z.number(),
  fee: z.bigint().optional(),
  hash: z.string().optional(),
  pubkey: z.string(),
  blockchain: z.string(),
  network: z.string(),
  token: z.string(),
});
export type Deposit = z.infer<typeof DepositSchema>;
