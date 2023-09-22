// Temporary file to centralize all the conversions.
// This file will be removed when the whole migration of the components is finalized

import { BigNumber } from '@ethersproject/bignumber'
import invariant from 'ts-invariant'
import {
  Account,
  AccountVerification,
  Asset,
  AssetHistory,
  AssetHistoryAction,
  AssetTrait,
  Auction,
  Collection,
  CollectionStats,
  CollectionTraitValue,
  Currency,
  Drop,
  Maybe,
  MintType,
  Offer,
  OfferOpenBuy,
  OfferOpenSale,
  OfferOpenSalesConnection,
  Ownership,
  Trade,
} from './graphql'

export const convertAsset = (
  asset: Pick<
    Asset,
    | 'id'
    | 'chainId'
    | 'collectionAddress'
    | 'tokenId'
    | 'animationUrl'
    | 'image'
    | 'name'
    | 'unlockedContent'
  > & {
    collection: Pick<Collection, 'address' | 'name' | 'chainId'>
    owned: Maybe<Pick<Ownership, 'quantity'>>
    bestBid: Maybe<{
      nodes: Array<
        Pick<Offer, 'unitPrice' | 'amount'> & {
          currency: Pick<Currency, 'decimals' | 'symbol'>
        }
      >
    }>
  },
): {
  id: string
  chainId: number
  collectionAddress: string
  tokenId: string
  animationUrl: string | null | undefined
  image: string
  name: string
  collection: {
    chainId: number
    address: string
    name: string
  }
  owned: BigNumber
  unlockedContent: { url: string; mimetype: string | null } | null
  bestBid:
    | {
        unitPrice: BigNumber
        currency: {
          decimals: number
          symbol: string
        }
      }
    | undefined
} => {
  const bestBid = asset.bestBid?.nodes[0]
  return {
    id: asset.id,
    chainId: asset.chainId,
    collectionAddress: asset.collectionAddress,
    tokenId: asset.tokenId,
    animationUrl: asset.animationUrl,
    image: asset.image,
    name: asset.name,
    collection: {
      chainId: asset.collection.chainId,
      address: asset.collection.address,
      name: asset.collection.name,
    },
    owned: BigNumber.from(asset.owned?.quantity || 0),
    unlockedContent: asset.unlockedContent,
    bestBid: bestBid
      ? {
          unitPrice: BigNumber.from(bestBid.unitPrice),
          currency: bestBid.currency,
        }
      : undefined,
  }
}

export const convertAssetWithSupplies = (
  asset: Parameters<typeof convertAsset>[0] &
    Pick<Asset, 'quantity'> & {
      sales: Pick<OfferOpenSalesConnection, 'totalAvailableQuantitySum'>
      collection: Pick<Collection, 'standard' | 'mintType'>
    },
): ReturnType<typeof convertAsset> & {
  saleSupply: BigNumber
  totalSupply: BigNumber
  owned: BigNumber
  collection: Pick<Collection, 'standard' | 'mintType'>
} => {
  const bestBid = asset.bestBid?.nodes[0]
  return {
    id: asset.id,
    chainId: asset.chainId,
    collectionAddress: asset.collectionAddress,
    tokenId: asset.tokenId,
    animationUrl: asset.animationUrl,
    image: asset.image,
    unlockedContent: asset.unlockedContent,
    name: asset.name,
    collection: {
      chainId: asset.collection.chainId,
      address: asset.collection.address,
      name: asset.collection.name,
      standard: asset.collection.standard,
      mintType: asset.collection.mintType,
    },
    saleSupply: BigNumber.from(asset.sales.totalAvailableQuantitySum),
    totalSupply: BigNumber.from(asset.quantity),
    owned: BigNumber.from(asset.owned?.quantity || 0),
    bestBid: bestBid
      ? {
          unitPrice: BigNumber.from(bestBid.unitPrice),
          currency: bestBid.currency,
        }
      : undefined,
  }
}

export const convertDropActive = (
  inProgressAndUpComing: Pick<
    Collection,
    'address' | 'chainId' | 'name' | 'image' | 'cover'
  > & {
    deployer: Pick<Account, 'address' | 'name' | 'username'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  } & {
    firstDrop: NonNullable<{ nodes: Array<Pick<Drop, 'startDate'>> }>
  } & {
    allDrops: NonNullable<{ nodes: Array<Pick<Drop, 'supply'>> }>
  } & {
    lastDrop: NonNullable<{
      nodes: Array<
        Pick<Drop, 'id' | 'endDate' | 'unitPrice'> & {
          currency: {
            id: string
            decimals: number
            symbol: string
            image: string
          }
        }
      >
    }>
  },
): {
  id: string
  startDate: Date
  endDate: Date
  unitPrice: string
  supply: number
  collection: {
    address: string
    chainId: number
    cover: string | null
    image: string | null
    name: string
    deployer: {
      address: string
      name: string | null
      username: string | null
      verified: boolean
    }
  }
  currency: {
    id: string
    decimals: number
    symbol: string
    image: string
  }
} => {
  const totalSupply = inProgressAndUpComing.allDrops.nodes.reduce(
    (acc, drop) => {
      if (drop.supply === null) return Infinity
      return acc + BigNumber.from(drop.supply).toNumber()
    },
    0,
  )

  invariant(inProgressAndUpComing.lastDrop.nodes[0], 'lastDrop is required')
  invariant(inProgressAndUpComing.firstDrop.nodes[0], 'firstDrop is required')
  return {
    id: inProgressAndUpComing.lastDrop.nodes[0].id,
    startDate: inProgressAndUpComing.firstDrop.nodes[0].startDate,
    endDate: inProgressAndUpComing.lastDrop.nodes[0].endDate,
    unitPrice: inProgressAndUpComing.lastDrop.nodes[0].unitPrice,
    supply: totalSupply,
    collection: {
      address: inProgressAndUpComing.address,
      chainId: inProgressAndUpComing.chainId,
      cover: inProgressAndUpComing.cover,
      image: inProgressAndUpComing.image,
      name: inProgressAndUpComing.name,
      deployer: {
        address: inProgressAndUpComing.deployer.address,
        name: inProgressAndUpComing.deployer.name,
        username: inProgressAndUpComing.deployer.username,
        verified:
          inProgressAndUpComing.deployer.verification?.status === 'VALIDATED',
      },
    },
    currency: {
      id: inProgressAndUpComing.lastDrop.nodes[0].currency.id,
      decimals: inProgressAndUpComing.lastDrop.nodes[0].currency.decimals,
      symbol: inProgressAndUpComing.lastDrop.nodes[0].currency.symbol,
      image: inProgressAndUpComing.lastDrop.nodes[0].currency.image,
    },
  }
}

export const convertDropEnded = (
  inProgressAndUpComing: Pick<
    Collection,
    'address' | 'chainId' | 'name' | 'image' | 'cover'
  > & {
    deployer: Pick<Account, 'address' | 'name' | 'username'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  } & {
    allDrops: NonNullable<{ nodes: Array<Pick<Drop, 'supply'>> }>
  } & {
    lastDrop: NonNullable<{
      nodes: Array<
        Pick<Drop, 'id' | 'startDate' | 'endDate' | 'unitPrice'> & {
          currency: {
            id: string
            decimals: number
            symbol: string
            image: string
          }
        }
      >
    }>
  },
): {
  id: string
  startDate: Date
  endDate: Date
  unitPrice: string
  supply: number
  collection: {
    address: string
    chainId: number
    cover: string | null
    image: string | null
    name: string
    deployer: {
      address: string
      name: string | null
      username: string | null
      verified: boolean
    }
  }
  currency: {
    id: string
    decimals: number
    symbol: string
    image: string
  }
} => {
  const totalSupply = inProgressAndUpComing.allDrops.nodes.reduce(
    (acc, drop) => {
      if (drop.supply === null) return Infinity
      return acc + BigNumber.from(drop.supply).toNumber()
    },
    0,
  )

  invariant(inProgressAndUpComing.lastDrop.nodes[0], 'lastDrop is required')
  return {
    id: inProgressAndUpComing.lastDrop.nodes[0].id,
    startDate: inProgressAndUpComing.lastDrop.nodes[0].startDate,
    endDate: inProgressAndUpComing.lastDrop.nodes[0].endDate,
    unitPrice: inProgressAndUpComing.lastDrop.nodes[0].unitPrice,
    supply: totalSupply,
    collection: {
      address: inProgressAndUpComing.address,
      chainId: inProgressAndUpComing.chainId,
      cover: inProgressAndUpComing.cover,
      image: inProgressAndUpComing.image,
      name: inProgressAndUpComing.name,
      deployer: {
        address: inProgressAndUpComing.deployer.address,
        name: inProgressAndUpComing.deployer.name,
        username: inProgressAndUpComing.deployer.username,
        verified:
          inProgressAndUpComing.deployer.verification?.status === 'VALIDATED',
      },
    },
    currency: {
      id: inProgressAndUpComing.lastDrop.nodes[0].currency.id,
      decimals: inProgressAndUpComing.lastDrop.nodes[0].currency.decimals,
      symbol: inProgressAndUpComing.lastDrop.nodes[0].currency.symbol,
      image: inProgressAndUpComing.lastDrop.nodes[0].currency.image,
    },
  }
}

export const convertCollection = (
  collection: Pick<
    Collection,
    'address' | 'name' | 'image' | 'cover' | 'chainId'
  > & {
    floorPrice: Maybe<Pick<CollectionStats, 'valueInRef' | 'refCode'>>
  } & {
    totalVolume: Pick<CollectionStats, 'valueInRef' | 'refCode'>
  },
): {
  chainId: number
  address: string
  name: string
  image: string | null
  cover: string | null
  totalVolume: string
  totalVolumeCurrencySymbol: string
  floorPrice: string | null
  floorPriceCurrencySymbol: string | null
} => {
  return {
    chainId: collection.chainId,
    address: collection.address,
    name: collection.name,
    image: collection.image,
    cover: collection.cover,
    totalVolume: collection.totalVolume?.valueInRef,
    totalVolumeCurrencySymbol: collection.totalVolume?.refCode,
    floorPrice: collection.floorPrice?.valueInRef || null,
    floorPriceCurrencySymbol: collection.floorPrice?.refCode || null,
  }
}

export const convertTraits = (asset: {
  traits: {
    nodes: Array<
      Pick<AssetTrait, 'type' | 'value'> & {
        collectionTraitValue: Maybe<
          Pick<CollectionTraitValue, 'numberOfAssets'>
        >
      }
    >
  }
  collection: {
    supply: number
  }
}): {
  type: string
  value: string
  percent: number
}[] => {
  const assetTraitsWithCounts = asset.traits.nodes.map((assetTrait) => {
    return {
      type: assetTrait.type,
      value: assetTrait.value,
      percent:
        ((assetTrait.collectionTraitValue?.numberOfAssets || 0) /
          asset.collection.supply) *
        100,
    }
  })

  return assetTraitsWithCounts
}

export const convertCollectionFull = (
  collection: Pick<
    Collection,
    | 'address'
    | 'chainId'
    | 'name'
    | 'description'
    | 'image'
    | 'cover'
    | 'twitter'
    | 'discord'
    | 'website'
  > & {
    deployer: Pick<Account, 'address' | 'name' | 'username'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  },
): {
  address: string
  chainId: number
  name: string
  description: string | null
  image: string | null
  cover: string | null
  twitter: string | null
  discord: string | null
  website: string | null
  deployer: {
    address: string
    name: string | null
    username: string | null
    verified: boolean
  }
} => {
  return {
    address: collection.address,
    chainId: collection.chainId,
    name: collection.name,
    description: collection.description,
    image: collection.image,
    cover: collection.cover,
    twitter: collection.twitter,
    discord: collection.discord,
    website: collection.website,
    deployer: {
      address: collection.deployer.address,
      name: collection.deployer.name,
      username: collection.deployer.username,
      verified: collection.deployer?.verification?.status === 'VALIDATED',
    },
  }
}

export const convertCollectionMetrics = (
  collection: Pick<Collection, 'numberOfOwners' | 'supply'> & {
    floorPrice: Maybe<Pick<CollectionStats, 'valueInRef' | 'refCode'>>
  } & {
    totalVolume: Pick<CollectionStats, 'valueInRef' | 'refCode'>
  },
): {
  totalVolume: string
  totalVolumeCurrencySymbol: string
  floorPrice: string | null
  floorPriceCurrencySymbol: string | null
  totalOwners: number
  supply: number
} => {
  return {
    totalVolume: collection.totalVolume.valueInRef,
    totalVolumeCurrencySymbol: collection.totalVolume.refCode,
    floorPrice: collection.floorPrice?.valueInRef || null,
    floorPriceCurrencySymbol: collection.floorPrice?.refCode || null,
    totalOwners: collection.numberOfOwners,
    supply: collection.supply,
  }
}

export const convertCollectionDropDetail = (
  collection: Pick<
    Collection,
    | 'address'
    | 'chainId'
    | 'name'
    | 'description'
    | 'image'
    | 'cover'
    | 'twitter'
    | 'discord'
    | 'website'
    | 'mintType'
  > & {
    deployer: Pick<Account, 'address' | 'name' | 'username'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  },
): {
  address: string
  chainId: number
  name: string
  description: string | null
  image: string | null
  cover: string | null
  twitter: string | null
  discord: string | null
  website: string | null
  deployer: {
    address: string
    name: string | null
    username: string | null
    verified: boolean
  }
  mintType: MintType
} => {
  return {
    address: collection.address,
    chainId: collection.chainId,
    name: collection.name,
    description: collection.description,
    image: collection.image,
    cover: collection.cover,
    twitter: collection.twitter,
    discord: collection.discord,
    website: collection.website,
    mintType: collection.mintType,
    deployer: {
      address: collection.deployer.address,
      name: collection.deployer.name,
      username: collection.deployer.username,
      verified: collection.deployer?.verification?.status === 'VALIDATED',
    },
  }
}

export const convertDropDetail = (
  drop: Pick<
    Drop,
    | 'id'
    | 'name'
    | 'startDate'
    | 'endDate'
    | 'unitPrice'
    | 'minted'
    | 'supply'
    | 'maxQuantityPerWallet'
    | 'isAllowed'
    | 'maxQuantity'
  > & {
    currency: Pick<Currency, 'id' | 'image' | 'symbol' | 'decimals'>
  },
): {
  id: string
  name: string
  startDate: Date
  endDate: Date
  unitPrice: string
  minted: string
  supply: string | null
  maxQuantityPerWallet: string | null
  isAllowed: boolean
  maxQuantity: string | null
  currency: {
    id: string
    decimals: number
    symbol: string
    image: string
  }
} => {
  return {
    id: drop.id,
    name: drop.name,
    startDate: drop.startDate,
    endDate: drop.endDate,
    unitPrice: drop.unitPrice,
    minted: drop.minted,
    supply: drop.supply || null,
    maxQuantityPerWallet: drop.maxQuantityPerWallet || null,
    isAllowed: drop.isAllowed,
    maxQuantity: drop.maxQuantity || null,
    currency: {
      id: drop.currency.id,
      decimals: drop.currency.decimals,
      symbol: drop.currency.symbol,
      image: drop.currency.image,
    },
  }
}

export const convertUser = (
  user: Maybe<
    Pick<Account, 'address' | 'image' | 'name'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  >,
  defaultAddress: string,
): {
  address: string
  image: string | null
  name: string | null
  verified: boolean
} => ({
  address: user?.address || defaultAddress,
  image: user?.image || null,
  name: user?.name || null,
  verified: user?.verification?.status === 'VALIDATED',
})

export const convertUserWithCover = (
  user: Maybe<
    Pick<Account, 'address' | 'image' | 'cover' | 'name'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  >,
  defaultAddress: string,
): ReturnType<typeof convertUser> & {
  cover: string | null
} => ({
  ...convertUser(user, defaultAddress),
  cover: user?.cover || null,
})

export const convertFullUser = (
  user: Maybe<
    Pick<
      Account,
      | 'address'
      | 'image'
      | 'name'
      | 'description'
      | 'cover'
      | 'instagram'
      | 'twitter'
      | 'website'
    > & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  >,
  defaultAddress: string,
): ReturnType<typeof convertUser> & {
  description: string | null
  cover: string | null
  instagram: string | null
  twitter: string | null
  website: string | null
} => ({
  ...convertUser(user, defaultAddress),
  description: user?.description || null,
  cover: user?.cover || null,
  instagram: user?.instagram || null,
  twitter: user?.twitter || null,
  website: user?.website || null,
})

export const convertOwnership = (
  ownership: Pick<Ownership, 'ownerAddress' | 'quantity'> & {
    owner:
      | (Pick<Account, 'address' | 'image' | 'name'> & {
          verification: Maybe<Pick<AccountVerification, 'status'>>
        })
      | null
  },
): Required<ReturnType<typeof convertUser>> & {
  quantity: string
} => ({
  ...convertUser(ownership.owner, ownership.ownerAddress),
  quantity: ownership.quantity,
})

export const convertHistories = (
  history: Pick<
    AssetHistory,
    | 'action'
    | 'date'
    | 'unitPrice'
    | 'quantity'
    | 'fromAddress'
    | 'toAddress'
    | 'transactionHash'
  > & {
    from:
      | (Pick<Account, 'image' | 'name'> & {
          verification: Maybe<Pick<AccountVerification, 'status'>>
        })
      | null
    to:
      | (Pick<Account, 'image' | 'name'> & {
          verification: Maybe<Pick<AccountVerification, 'status'>>
        })
      | null
    currency: Maybe<Pick<Currency, 'decimals' | 'symbol'>>
  },
): {
  action: AssetHistoryAction
  date: Date
  unitPrice: BigNumber | null
  quantity: BigNumber
  transactionHash: string | null
  fromAddress: string
  from: {
    name: string | null
    image: string | null
    verified: boolean
  } | null
  toAddress: string | null
  to: {
    name: string | null
    image: string | null
    verified: boolean
  } | null
  currency: {
    decimals: number
    symbol: string
  } | null
} => {
  return {
    action: history.action,
    date: new Date(history.date),
    unitPrice: (history.unitPrice && BigNumber.from(history.unitPrice)) || null,
    quantity: BigNumber.from(history.quantity),
    fromAddress: history.fromAddress,
    transactionHash: history.transactionHash,
    from: history.from
      ? {
          image: history.from.image,
          name: history.from.name,
          verified: history.from.verification?.status === 'VALIDATED',
        }
      : null,
    toAddress: history.toAddress,
    to: history.to
      ? {
          image: history.to.image,
          name: history.to.name,
          verified: history.to.verification?.status === 'VALIDATED',
        }
      : null,
    currency: history.currency,
  }
}

export const convertAuctionWithBestBid = (auction: {
  endAt: Date
  bestBid: Maybe<{
    nodes: Array<
      Pick<Offer, 'unitPrice' | 'amount'> & {
        currency: Pick<Currency, 'decimals' | 'symbol'>
      }
    >
  }>
}): {
  endAt: Date
  bestBid:
    | {
        unitPrice: BigNumber
        amount: BigNumber
        currency: {
          decimals: number
          symbol: string
        }
      }
    | undefined
} => {
  const bestBid = auction.bestBid?.nodes[0]
  if (!bestBid)
    return {
      endAt: new Date(auction.endAt),
      bestBid: undefined,
    }
  return {
    endAt: new Date(auction.endAt),
    bestBid: {
      amount: BigNumber.from(bestBid.amount),
      unitPrice: BigNumber.from(bestBid.unitPrice),
      currency: bestBid.currency,
    },
  }
}

export const convertAuctionFull = (
  auction: Pick<Auction, 'id' | 'reserveAmount' | 'endAt' | 'expireAt'> & {
    winningOffer: { id: string } | null | undefined
    currency: Pick<Currency, 'decimals' | 'symbol' | 'image'>
  },
): {
  id: string
  reserveAmount: BigNumber
  endAt: Date
  expireAt: Date
  currency: {
    decimals: number
    symbol: string
    image: string
  }
  winningOffer: { id: string } | null | undefined
} => {
  return {
    id: auction.id,
    reserveAmount: BigNumber.from(auction.reserveAmount),
    endAt: new Date(auction.endAt),
    expireAt: new Date(auction.expireAt),
    currency: auction.currency,
    winningOffer: auction.winningOffer,
  }
}

export const convertSale = (
  sale:
    | (Pick<OfferOpenSale, 'unitPrice' | 'id'> & {
        currency: Pick<Currency, 'decimals' | 'symbol' | 'id' | 'image'>
      })
    | undefined,
):
  | undefined
  | {
      id: string
      unitPrice: BigNumber
      currency: {
        id: string
        decimals: number
        symbol: string
        image: string
      }
    } => {
  if (!sale) return
  return {
    id: sale.id,
    unitPrice: BigNumber.from(sale.unitPrice),
    currency: sale.currency,
  }
}

export const convertSaleFull = (
  sale: Parameters<typeof convertSale>[0] &
    Pick<OfferOpenSale, 'id' | 'expiredAt' | 'availableQuantity'> & {
      maker: Pick<Account, 'address' | 'name' | 'image'> & {
        verification: Maybe<Pick<AccountVerification, 'status'>>
      }
    },
): Required<ReturnType<typeof convertSale>> & {
  id: string
  maker: {
    address: string
    name: string | null | undefined
    image: string | null | undefined
    verified: boolean
  }
  expiredAt: Date | undefined
  availableQuantity: BigNumber
} => {
  const base = convertSale(sale)
  if (!base) throw new Error('invalid sale')
  return {
    ...base,
    id: sale.id,
    maker: {
      address: sale.maker.address,
      name: sale.maker.name,
      image: sale.maker.image,
      verified: sale.maker.verification?.status === 'VALIDATED',
    },
    expiredAt: sale.expiredAt ? new Date(sale.expiredAt) : undefined,
    availableQuantity: BigNumber.from(sale.availableQuantity),
  }
}

export const convertBid = (
  bid: Pick<OfferOpenBuy, 'unitPrice' | 'amount'> & {
    currency: Pick<Currency, 'decimals' | 'symbol' | 'id' | 'image'>
    maker: Pick<Account, 'address' | 'name' | 'image'> & {
      verification: Maybe<Pick<AccountVerification, 'status'>>
    }
  },
): {
  maker: {
    address: string
    name: string | null | undefined
    image: string | null | undefined
    verified: boolean
  }
  amount: BigNumber
  unitPrice: BigNumber
  currency: {
    id: string
    decimals: number
    symbol: string
    image: string
  }
} => {
  return {
    amount: BigNumber.from(bid.amount),
    maker: {
      address: bid.maker.address,
      image: bid.maker.image,
      name: bid.maker.name,
      verified: bid.maker.verification?.status === 'VALIDATED',
    },
    unitPrice: BigNumber.from(bid.unitPrice),
    currency: bid.currency,
  }
}

export const convertBidFull = (
  bid: Parameters<typeof convertBid>[0] &
    Pick<Offer, 'id' | 'availableQuantity' | 'expiredAt' | 'createdAt'> & {
      auctionId?: string | null
    },
): Required<ReturnType<typeof convertBid>> & {
  id: string
  availableQuantity: BigNumber
  expiredAt: Date | undefined
  createdAt: Date
  auctionId?: string
} => {
  return {
    ...convertBid(bid),
    id: bid.id,
    availableQuantity: BigNumber.from(bid.availableQuantity),
    expiredAt: bid.expiredAt ? new Date(bid.expiredAt) : undefined,
    createdAt: new Date(bid.createdAt),
    auctionId: bid?.auctionId || undefined,
  }
}

export const convertTrade = (
  trade: Pick<
    Trade,
    | 'timestamp'
    | 'transactionHash'
    | 'amount'
    | 'quantity'
    | 'buyerAddress'
    | 'sellerAddress'
  > & {
    buyer?: Maybe<
      Pick<Account, 'address' | 'name' | 'image'> & {
        verification: Maybe<Pick<AccountVerification, 'status'>>
      }
    >
    seller?: Maybe<
      Pick<Account, 'address' | 'name' | 'image'> & {
        verification: Maybe<Pick<AccountVerification, 'status'>>
      }
    >
    currency: Maybe<
      Pick<Currency, 'id' | 'image' | 'name' | 'decimals' | 'symbol'>
    >
    asset: Maybe<Pick<Asset, 'id' | 'name' | 'image' | 'chainId'>>
  },
): {
  transactionHash: string
  amount: BigNumber
  quantity: BigNumber
  buyerAddress: string
  sellerAddress: string
  buyer: {
    address: string
    name: string | null | undefined
    image: string | null | undefined
    verified: boolean
  }
  seller: {
    address: string
    name: string | null | undefined
    image: string | null | undefined
    verified: boolean
  }
  createdAt: Date
  currency: {
    name: string
    id: string
    image: string
    decimals: number
    symbol: string
  } | null
  asset?: {
    id: string
    name: string
    image: string
    chainId: number
  }
} => {
  return {
    transactionHash: trade.transactionHash,
    amount: BigNumber.from(trade.amount),
    buyerAddress: trade.buyerAddress,
    createdAt: new Date(trade.timestamp),
    quantity: BigNumber.from(trade.quantity),
    sellerAddress: trade.sellerAddress,
    buyer: {
      address: trade.buyer?.address || trade.buyerAddress,
      name: trade.buyer?.name,
      image: trade.buyer?.image,
      verified: trade.buyer?.verification?.status === 'VALIDATED',
    },
    seller: {
      address: trade.seller?.address || trade.sellerAddress,
      name: trade.seller?.name,
      image: trade.seller?.image,
      verified: trade.seller?.verification?.status === 'VALIDATED',
    },
    currency: trade.currency,
    asset: trade.asset
      ? {
          id: trade.asset.id,
          name: trade.asset.name,
          image: trade.asset.image,
          chainId: trade.asset.chainId,
        }
      : undefined,
  }
}
