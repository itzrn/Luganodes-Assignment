import { Deposit, DepositSchema } from "core/domain/deposit";
import {
  IBlockchainGateway,
  INotifierGateway,
  TransactionData,
} from "core/types.gateways";
import { IDepositsRepository } from "core/types.repositories";
import { DepositsTrackerService as IDepositsTrackerService } from "core/types.services";

export class DepositsTrackerService implements IDepositsTrackerService {
  private blockchainGateway: IBlockchainGateway;
  private notificatorGateway: INotifierGateway | undefined;
  private depositsRepository: IDepositsRepository;
  private filterIn: string[];

  constructor(options: {
    blockchainGateway: IBlockchainGateway;
    notificatorGateway?: INotifierGateway;
    depositsRepository: IDepositsRepository;
    filterIn: string[];
  }) {
    this.blockchainGateway = options.blockchainGateway;
    this.notificatorGateway = options.notificatorGateway;
    this.depositsRepository = options.depositsRepository;
    this.filterIn = options.filterIn;

    if (this.filterIn.length)
      console.info(
        `Filtering deposits for addresses: ${this.filterIn.join(", ")}`
      );

    this.notificatorGateway?.sendNotification(
      `Deposits tracker service started`
    );
  }
  public async processBlockTransactions(
    blockNumberOrHash: string | number = "latest"
  ): Promise<void> {
    try {
      const transactions = await this.blockchainGateway.fetchBlockTransactions(
        blockNumberOrHash
      );

      const sotreBatchSize = 5;
      if (transactions && transactions.length > 0) {
        const batches = Math.ceil(transactions.length / sotreBatchSize);
        for (let i = 0; i < batches; i++) {
          const batch = transactions.slice(
            i * sotreBatchSize,
            (i + 1) * sotreBatchSize
          );
          for (const tx of batch) {
            await this.processTransaction(tx);
          }
        }
      }
    } catch (error: any) {
    }
  }

  public async processBlockTransactionsFrom(blockNumber: number) {
    const lastStoredBlockNumber =
      (await this.depositsRepository.getLatestStoredBlock()) || blockNumber;
    if (lastStoredBlockNumber)
      console.info(
        `Executing block txs processing from block number ${lastStoredBlockNumber} as it's <last stored/requested> block number:`
      );

    let latestBlock = await this.blockchainGateway.getBlockNumber();
    console.info(`Latest block number: ${latestBlock}`);

    const promises = [];
    for (let i = lastStoredBlockNumber; i <= latestBlock; i++) {
      promises.push(this.processBlockTransactions(i));
    }
    await Promise.all(promises);

    console.info(
      `Finished processing blocks from ${lastStoredBlockNumber} to ${latestBlock}`
    );
  }
  public startPendingTransactionsListener(): void {
    this.blockchainGateway.watchPendingTransactions((tx: TransactionData) => {
      this.processTransaction(tx);
    });
  }
  public startMintedBlocksListener(): void {
    this.blockchainGateway.watchMintedBlocks((blockNumber: number) => {
      this.processBlockTransactions(blockNumber);
    });
  }

  private async processTransaction(txData: TransactionData): Promise<void> {
    try {
      if (!this.filterIn.includes(txData.to)) return;

      console.info("Found deposit transaction:", txData.hash);
      const fee = txData.gasLimit * txData.gasPrice;

      const deposit: Deposit = {
        blockNumber: txData.blockNumber,
        blockTimestamp: txData.blockTimestamp,
        pubkey: txData.from,
        fee: fee,
        hash: txData.hash,
        blockchain: this.blockchainGateway.blockchain,
        network: this.blockchainGateway.network,
        token: this.blockchainGateway.token,
      };

      DepositSchema.parse(deposit);
      await this.depositsRepository.storeDeposit(deposit);
      await this.notificatorGateway?.sendNotification(
        `Deposit processed: ${txData.hash}\n\nAmount: ${txData.value}\nFee: ${fee}\nFrom: ${txData.from}\nTo: ${txData.to}\nBlock: ${txData.blockNumber}`
      );
    } catch (error) {
      await this.notificatorGateway?.sendNotification(
        `Error processing deposit: ${txData.hash}`
      );
    }
  }
}
