// Тексты карточки оффера (шаг 13). Названия и условия оффера приходят из
// data/offers.json как есть; здесь — только обвязка карточки.
// TODO(legal): юрист подтверждает все формулировки ниже перед включением
// OFFERS_ENABLED=true. Без «бонус», «выиграй» и призывов играть.

export const OFFER_BLOCK_LABEL = 'Реклама'
export const OFFER_AD_LABEL = 'Реклама'
export const OFFER_LINK_TEXT = 'Перейти на сайт букмекера' // TODO(legal)
export const OFFER_LINK_HINT = 'открывается в новой вкладке'
export const OFFER_ADVERTISER_PREFIX = 'Рекламодатель' // TODO(legal)
export const OFFER_ERID_PREFIX = 'erid' // TODO(legal)

// TODO(data): логотип БК — нужно поле в data/offers.json и файлы в public/;
// пока в карточке только текст (сценарий «Картинка в оффере»).

export function advertiserLine(name: string, inn: string): string {
  return `${OFFER_ADVERTISER_PREFIX}: ${name}, ИНН ${inn}`
}
