import { Deposit } from "core/domain/deposit";
import { IDepositsRepository } from "core/types.repositories";
import { GetDepositsProps } from "core/types.services";
import { Model } from "mongoose";
export class DepositsRepository implements IDepositsRepository {
  private depel: Model<Deposit>;

  constructor(depel: Model<Deposit>) {
    this.depel = depel;
  }

  public async storeDeposit(deposit: Deposit): Promise<void> {
    try {
      const newDeposit = new this.depel({
        id: deposit.hash,
        ...deposit,
      });
      await newDeposit.save();
    } catch (error: any) {
      if (error.code === 11000) {
        console.warn("Deposit with this hash already exists:", deposit.hash);
        return;
      }

      console.error("Error storing deposit:", error);
      throw error;
    }
  }

  public async getLatestStoredBlock(): Promise<number | null> {
    const tx = await this.depel
      .findOne()
      .sort({ blockNumber: -1 })
      .limit(1)
      .exec();

    return tx ? tx.blockNumber : null;
  }

  public async getDeposits(props: GetDepositsProps): Promise<Deposit[]> {
    const deposits = await this.depel
      .find({
        blockchain: props.blockchain,
        network: props.network,
        token: props.token,
        blockTimestamp: props.blockTimestamp
          ? { $gte: props.blockTimestamp }
          : undefined,
      })
      .exec();

    return deposits;
  }
}
