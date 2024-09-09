import { getEthBeaconDepositTrackerService } from "./context";
import envs from "utils/env";
const main = async () => {
  const ethBeaconDepositTrackerService =
    await getEthBeaconDepositTrackerService();

  ethBeaconDepositTrackerService.processBlockTransactionsFrom(
    envs.ETH_BLOCK_FROM
  );

  ethBeaconDepositTrackerService.startMintedBlocksListener();
};

main();
