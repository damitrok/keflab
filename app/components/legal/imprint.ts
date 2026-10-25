import type { Media } from '../../../data/schema'

export interface ImprintRow {
  label: string
  value: string
  /** Ссылка для контакта: mailto: или tel:. Не внешний домен. */
  href?: string
}

/**
 * Строки выходных данных СМИ. Пока media.registered = false — пусто:
 * блок не выводится вовсе. Данные только из data/site.json.
 */
export function imprintRows(media: Media): ImprintRow[] {
  if (!media.registered) return []
  const phoneHref = `tel:${media.phone.replace(/[^\d+]/g, '')}`
  return [
    { label: 'Наименование', value: media.name },
    { label: 'Учредитель', value: media.founder },
    { label: 'Главный редактор', value: media.editorInChief },
    { label: 'E-mail редакции', value: media.email, href: `mailto:${media.email}` },
    { label: 'Телефон редакции', value: media.phone, href: phoneHref },
    {
      label: 'Свидетельство о регистрации СМИ',
      value: `${media.registrationNumber}, выдано: ${media.registrationAuthority}`,
    },
  ]
}
