import { Text } from '@chakra-ui/react'
import Trans from 'next-translate/Trans'
import Price from '../../Price/Price'

export type IProps = {
  offer: {
    amount: string
    unitPrice: string
    quantity: string
    asset: {
      id: string
      image: string
      name: string
    }
    currency: {
      decimals: number
      symbol: string
    }
  }
}

export default function BidExpired({ offer }: IProps): {
  link: string
  image: string
  children: JSX.Element
} {
  return {
    link: `/tokens/${offer.asset.id}`,
    image: offer.asset.image,
    children: (
      <Trans
        ns="components"
        i18nKey="notification.bid.expired"
        components={[
          <Text as="span" fontWeight="bold" key="1" />,
          <Text as="span" fontWeight="bold" key="2" />,
          <Text as="span" fontWeight="bold" key="price">
            <Price amount={offer.unitPrice} currency={offer.currency} />
          </Text>,
        ]}
        values={{ count: parseInt(offer.quantity, 10), name: offer.asset.name }}
      />
    ),
  }
}
