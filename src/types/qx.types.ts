export interface Order {
  entityId: string;
  price: number;
  numberOfShares: number;
}

export interface OwnedAsset {
  data: {
    issuedAsset: {
      name: string;
      issuerIdentity: string;
      numberOfDecimalPlaces: number;
      type: number;
      unitOfMeasurement: number[];
    };
    numberOfUnits: number;
    managingContractIndex: number;
  };
}

export interface IFees {
  assetIssuanceFee: number;
  transferFee: number;
  tradeFee: number;
}

export type Asset = {
  issuer: string;
  name: string;
  balance?: number;
};

export type AssetOrder = {
  entityId: string;
  price: number;
  numberOfShares: number;
};

export type EntityOrder = {
  issuerId: string;
  assetName: string;
  price: number;
  numberOfShares: number;
};

export type Trade = {
  tickTime: string;
  transactionHash: string;
  taker: string;
  maker: string;
  issuer: string;
  assetName: string;
  bid: boolean;
  price: number;
  numberOfShares: number;
};

export type TransferExtraData = {
  issuer: string;
  name: string;
  newOwner: string;
  numberOfShares: number;
};

export type Transfer = {
  tickTime: string;
  hash: string;
  source: string;
  amount: number;
  tick: number;
  extraData: TransferExtraData;
  moneyFlew: boolean;
};

export type IssuedAssetExtraData = {
  name: string;
  numberOfShares: number;
  numberOfDecimalPlaces: number;
};

export type IssuedAsset = {
  tickTime: string;
  hash: string;
  source: string;
  amount: number;
  tick: number;
  extraData: IssuedAssetExtraData;
  moneyFlew: boolean;
};

export type AveragePrice = {
  time: string;
  min: number;
  max: number;
  totalShares: number;
  totalAmount: number;
  totalTrades: number;
  averagePrice: number;
};

export type OrderTemplate = {
  currentTick: number;
  from: string;
  to: string;
  inputType: number;
  amount: number;
  extraData: string;
}

export type OrderRequest = {
  from: string;
  numberOfShares: number;
  pricePerShare: number;
}
