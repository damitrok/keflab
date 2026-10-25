import { z } from 'zod'

const nonEmpty = z.string().trim().min(1, 'значение не должно быть пустым')

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

const isoDate = z.string().refine(isRealDate, 'нужна дата в формате ГГГГ-ММ-ДД')
const httpUrl = z.url({ message: 'нужен корректный URL', protocol: /^https?$/ })
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug: строчные латинские буквы, цифры и дефис')

/** Сумма в рублях строкой: «10», «0.5» — без number, чтобы не терять точность. */
const rubles = z
  .string()
  .regex(/^\d{1,9}(?:\.\d{1,2})?$/, 'сумма строкой, например "10" или "0.50"')

/**
 * Правила расчёта системы у БК (шаг 10). Машиночитаемые поля калькулятор
 * берёт как настройки; текстовые показываются на странице как есть.
 */
export const systemRulesSchema = z
  .object({
    /** Как вводится ставка: на всю систему или на одну комбинацию. */
    stakeSplit: z.enum(['total', 'per_combination'], {
      message: 'stakeSplit: "total" (на всю систему) или "per_combination" (на комбинацию)',
    }),
    /** Пояснение к делению ставки словами букмекера (например, про округление). */
    stakeSplitNote: nonEmpty.optional(),
    minStakePerCombination: rubles,
    /** Как считаются возвраты (текст для страницы). */
    voidRule: nonEmpty,
    /** Как считаются половины (текст для страницы). */
    halfRule: nonEmpty,
    maxEvents: z.number().int('нужно целое число').min(3, 'минимум 3').max(16, 'максимум 16'),
  })
  .strict()

export const bookmakerSchema = z
  .object({
    slug,
    name: nonEmpty,
    legalEntity: nonEmpty,
    licenseInfo: nonEmpty,
    /** null — правила ещё не собраны: страница БК не собирается. */
    systemRules: systemRulesSchema.nullable(),
    sourceUrl: httpUrl,
    /** Дата проверки правил человеком; старше 180 дней — страница не собирается. */
    checkedAt: isoDate.nullable(),
  })
  .strict()

export const bookmakersSchema = z.array(bookmakerSchema).superRefine((items, ctx) => {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (seen.has(item.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: [i, 'slug'],
        message: `повторяющийся slug «${item.slug}»`,
      })
    }
    seen.add(item.slug)
  })
})

export const offerSchema = z
  .object({
    id: slug,
    bookmakerSlug: slug,
    advertiserName: nonEmpty,
    advertiserInn: z.string().regex(/^(\d{10}|\d{12})$/, 'ИНН: 10 или 12 цифр'),
    erid: nonEmpty,
    trackingUrl: httpUrl,
    title: nonEmpty,
    conditionsShort: nonEmpty,
    validFrom: isoDate,
    validTo: isoDate,
    geo: z.array(z.string().regex(/^[A-Z]{2}$/, 'код страны: две заглавные латинские буквы')),
    placements: z.array(nonEmpty),
  })
  .strict()
  .superRefine((offer, ctx) => {
    if (
      isRealDate(offer.validFrom) &&
      isRealDate(offer.validTo) &&
      offer.validFrom > offer.validTo
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'validTo не может быть раньше validFrom',
      })
    }
  })

export const offersSchema = z.array(offerSchema).superRefine((items, ctx) => {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `повторяющийся id «${item.id}»` })
    }
    seen.add(item.id)
  })
})

const hostname = z
  .string()
  .regex(
    /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/,
    'нужен хост без протокола, пути и порта, в нижнем регистре (например example.ru)',
  )

export const allowlistSchema = z
  .object({
    domains: z.array(hostname),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.domains.forEach((d, i) => {
      if (seen.has(d)) {
        ctx.addIssue({ code: 'custom', path: ['domains', i], message: `дубль домена «${d}»` })
      }
      seen.add(d)
    })
  })

export const mediaSchema = z
  .object({
    registered: z.boolean(),
    name: z.string(),
    founder: z.string(),
    editorInChief: z.string(),
    email: z.string(),
    phone: z.string(),
    registrationNumber: z.string(),
    registrationAuthority: z.string(),
  })
  .strict()
  .superRefine((media, ctx) => {
    if (!media.registered) return
    const fields = [
      'name',
      'founder',
      'editorInChief',
      'email',
      'phone',
      'registrationNumber',
      'registrationAuthority',
    ] as const
    for (const f of fields) {
      if (media[f].trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: [f],
          message: 'обязательно при registered=true: значение не должно быть пустым',
        })
      }
    }
    if (media.email.trim() !== '' && !z.email().safeParse(media.email).success) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'некорректный email' })
    }
  })

export const siteSchema = z
  .object({
    siteName: nonEmpty,
    siteUrl: httpUrl,
    media: mediaSchema,
    riskWarning: z.string(),
    stopWords: z.array(nonEmpty),
  })
  .strict()

export type SystemRules = z.infer<typeof systemRulesSchema>
export type Bookmaker = z.infer<typeof bookmakerSchema>
export type Offer = z.infer<typeof offerSchema>
export type Allowlist = z.infer<typeof allowlistSchema>
export type Media = z.infer<typeof mediaSchema>
export type SiteConfig = z.infer<typeof siteSchema>

/** Обязательные файлы каталога data/ и схемы для них. */
export const dataFileSchemas = {
  'bookmakers.json': bookmakersSchema,
  'offers.json': offersSchema,
  'allowlist.json': allowlistSchema,
  'site.json': siteSchema,
} as const

export type DataFileName = keyof typeof dataFileSchemas
