export const ISSUE_QUANTITY_FIELDS = [
  { key: 'riceKg', label: 'Rice quantity' },
  { key: 'ragiKg', label: 'Ragi quantity' },
] as const;

type CardTypeRecord = {
  cardType?: string | null;
};

export const isReferenceCardType = (cardType: string | null | undefined) =>
  /\bNPHH\b/i.test(cardType ?? '');

export const shouldShowCardHolder = (card: CardTypeRecord) =>
  !isReferenceCardType(card.cardType);
