import { ethers } from "ethers";
import { BlockchainGateway } from "./BlockchainGateway";
import { IBlockchainProvider, IBlockchainGateway } from "core/types.gateways";
import { ProviderEvent } from "ethers";

interface EthereumGatewayConfig {
  rpcUrl: string;
  apiKey: string;
  network?: ethers.Networkish;
  version?: string;
  metadata: {
    network: "mainnet" | "ropsten" | "rinkeby" | "goerli" | "kovan";
  };
}

class EthereumProvider implements IBlockchainProvider {
  private prov: ethers.JsonRpcProvider;

  constructor(config: EthereumGatewayConfig) {
    const fullRpcUrl = `${config.rpcUrl}/v2/${config.apiKey}`;
    this.prov = new ethers.JsonRpcProvider(fullRpcUrl, config.network);
  }

  async getTransaction(txHash: string): Promise<any> {
    return this.prov.getTransaction(txHash);
  }

  async getBlock(blockNumberOrHash: string | number): Promise<any> {
    return this.prov.getBlock(blockNumberOrHash);
  }

  async getBlockNumber(): Promise<any> {
    return this.prov.getBlockNumber();
  }

  async getTransactionTrace(
    txHash: string,
    options: {
      tracer?:
        | "callTracer"
        | "stateDiffTracer"
        | "structuredTracer"
        | "vmTracer"
        | "parity";
      timeout?: number;
    } = {}
  ): Promise<any> {
    try {
      const opts = {
        tracer: "callTracer",
        ...options,
      };

      const trace = await this.prov.send("debug_traceTransaction", [
        txHash,
        opts,
      ]);
      return trace;
    } catch (error) {
      console.error("Error fetching transaction trace:", error);
      return null;
    }
  }

  on(event: ProviderEvent, listener: (data: any) => void): void {
    this.prov.on(event, listener);
  }
}

export class EthereumGateway
  extends BlockchainGateway
  implements IBlockchainGateway
{
  token: string = "ETH";
  constructor(config: EthereumGatewayConfig) {
    const ethereumProvider = new EthereumProvider(config);
    super({
      prov: ethereumProvider,
      blockchain: "ethereum",
      network: config.metadata.network,
      token: "ETH",
    });
  }
}
