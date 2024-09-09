import { Mongoose } from "mongoose";

import { EthereumGateway } from "adap/gateways/RPC/EthereumGateway";
import { DepositsTrackerService } from "core/services/DepositsTrackerService";
import { DepositsTrackerService as IDepositsTrackerService } from "core/types.services";
import createMongooseConnection from "database/createMongooseConnection";
import envs from "utils/env";
import { IDepositsRepository } from "core/types.repositories";
import { DepositModel } from "database/schemas/Deposit";
import { DepositsRepository } from "adap/repositories/DepositsRepository";
import { TelegramNotifierGateway } from "adap/gateways/notifications/TelegramNotifierGateway";

let mongooseConnection: Mongoose;

let ethGateway: EthereumGateway;
let telegramNotifierGateway: TelegramNotifierGateway;

let depo: IDepositsRepository;

let ethBeaconService: IDepositsTrackerService;

const getMongooseConnection = async () => {
  if (!mongooseConnection) {
    mongooseConnection = await createMongooseConnection(envs.MONGO_URI);
  }

  return mongooseConnection;
};
const getDepositsRepository = async () => {
  if (!depo) {
    console.info("Creating new DepositsRepository");

    await getMongooseConnection();

    depo = new DepositsRepository(DepositModel);
  }

  return depo;
};
const getEthGateway = async () => {
  if (!ethGateway) {
    console.info("Creating new EthereumGateway");

    ethGateway = new EthereumGateway({
      rpcUrl: "https://eth-mainnet.g.alchemy.com",
      apiKey: envs.ALCHEMY_API_KEY,
      metadata: {
        network: "mainnet",
      },
    });
  }

  return ethGateway;
};

const getTelegramNotifierGateway = async () => {
  if (!telegramNotifierGateway) {
    console.info("Creating new TelegramNotifierGateway");

    telegramNotifierGateway = new TelegramNotifierGateway({
      botT: envs.TELEGRAM_NOTIFICATIONS_BOT_TOKEN,
      chatId: envs.TELEGRAM_NOTIFICATIONS_CHAT_ID,
    });
  }

  return telegramNotifierGateway;
};

export const getEthBeaconDepositTrackerService = async () => {
  if (!ethBeaconService) {
    await getMongooseConnection();

    const deposit = await getDepositsRepository();

    const tel = await getTelegramNotifierGateway();

    const ethGateway = await getEthGateway();

    ethBeaconService = new DepositsTrackerService({
      blockchainGateway: ethGateway,
      notificatorGateway: tel,
      depositsRepository: deposit,
      filterIn: ["0x1391be19259f10e01336a383217cf35344dd7aa157e95030f46235448ef5e5d6"],
    });

    console.info("EthBeaconService created");
  }

  return ethBeaconService;
};
