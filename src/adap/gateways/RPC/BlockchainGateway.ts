import {
  IBlockchainProvider,
  IBlockchainGateway,
  TransactionData,
} from "core/types.gateways";
import sleep from "utils/sleep";
interface BlockchainGatewayConfig {
  prov: IBlockchainProvider;
  batch?: number;
  retries?: number;
  blockchain: string;
  network: string;
  token: string;
}
interface QueueItem {
  fetchCallback: () => Promise<any>;
  resolvePromise: (data: any) => void;
}
export class BlockchainGateway implements IBlockchainGateway {
  private prov: IBlockchainProvider;
  private batch: number;
  private fetchQueue: QueueItem[] = [];
  private isFetching = false;
  private retries: number;

  public blockchain: string;
  public network: string;
  public token: string;

  constructor(config: BlockchainGatewayConfig) {
    this.prov = config.prov;
    this.batch = config.batch || 15;
    this.retries = config.retries || 15;
    this.blockchain = config.blockchain;
    this.network = config.network;
    this.token = config.token;
  }

  private async queueFetchOperation<T>(
    fetchCallback: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve) => {
      this.fetchQueue.push({ fetchCallback, resolvePromise: resolve });
      this.processFetchQueue();
    });
  }

  private async processFetchQueue(): Promise<void> {
    if (this.isFetching || this.fetchQueue.length === 0) return;

    this.isFetching = true;
    const batch = this.fetchQueue.splice(0, this.batch);

    const promises = batch.map(async ({ fetchCallback, resolvePromise }) => {
      const data = await this.executeFetchWithRetry(fetchCallback);
      resolvePromise(data);
    });

    await Promise.all(promises);
    console.info(`Processed ${batch.length} fetch operations`);

    this.isFetching = false;
    this.processFetchQueue();
  }

  private async executeFetchWithRetry<T>(
    fetchCallback: () => Promise<T>,
    retries = this.retries,
    backoff = 1000
  ): Promise<T | null> {
    try {
      return await fetchCallback();
    } catch (error: any) {
      if (retries > 0 && error?.error?.code === 429) {
        console.warn(`Rate limit exceeded. Retrying in ${backoff}ms...`);
        await sleep(backoff);
        return this.executeFetchWithRetry(
          fetchCallback,
          retries - 1,
          backoff * 2
        );
      }
      else if (error?.error?.code === -32603) {
        console.warn(`Timeout error. Retrying in ${backoff}ms...`);
        await sleep(backoff);
        return this.executeFetchWithRetry(
          fetchCallback,
          retries - 1,
          backoff * 2
        );
      } else {
        console.error("System could not recover from rate limit error");
        throw error;
      }
    }
  }

  public async getTransactionData(
    txHash: string
  ): Promise<TransactionData | null> {
    return this.queueFetchOperation(async () => {
      const tx = await this.prov.getTransaction(txHash);
      if (tx) {
        const block = await this.prov.getBlock(tx.blockNumber);
        return {
          value: tx.value,
          blockTimestamp: block.timestamp,
          blockNumber: tx.blockNumber,
          blockHash: tx.blockHash,
          index: tx.index,
          hash: tx.hash,
          type: tx.type,
          to: tx.to,
          from: tx.from,
          nonce: tx.nonce,
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
          maxFeePerGas: tx.maxFeePerGas,
          maxFeePerBlobGas: tx.maxFeePerBlobGas,
        };
      }
      return null;
    });
  }
  public async fetchBlockTransactions(
    blockNumberOrHash: number | string
  ): Promise<TransactionData[] | null> {
    console.info("Fetching block transactions from block:", blockNumberOrHash);
    const block = await this.queueFetchOperation(() =>
      this.prov.getBlock(blockNumberOrHash)
    );

    if (block && block.transactions) {
      const deposits: TransactionData[] = [];
      const promises = block.transactions.map(async (txHash: string) => {
        const deposit = await this.getTransactionData(txHash);
        if (deposit) {
          deposits.push(deposit);
        }
      });
      await Promise.all(promises);
      return deposits.length > 0 ? deposits : null;
    }
    return null;
  }

  public async watchPendingTransactions(
    callback: (data: TransactionData) => void
  ): Promise<void> {
    console.info("Watching for pending transactions...");

    this.prov.on("pending", async (txHash: string) => {
      const data = await this.getTransactionData(txHash);
      data && callback(data);
    });
  }

  public async watchMintedBlocks(
    callback: (blockNumber: number) => void
  ): Promise<void> {
    console.info("Watching for new minted blocks...");
    this.prov.on("block", async (blockNumber: number) => {
      callback(blockNumber);
    });
  }
  public async getBlockNumber() {
    return this.queueFetchOperation(() => this.prov.getBlockNumber());
  }
}
