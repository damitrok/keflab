import { describe, expect, it } from 'vitest'
import { imprintRows } from '../../app/components/legal/imprint'
import type { Media } from '../../data/schema'
import site from '../../data/site.json'

const filled: Media = {
  registered: true,
  name: 'Название',
  founder: 'Учредитель',
  editorInChief: 'Редактор',
  email: 'red@example.test',
  phone: '+7 (900) 000-00-00',
  registrationNumber: 'ЭЛ № 1',
  registrationAuthority: 'Орган',
}

describe('imprintRows', () => {
  it('пока СМИ не зарегистрировано, строк нет', () => {
    expect(imprintRows({ ...filled, registered: false })).toEqual([])
    expect(imprintRows(site.media)).toEqual([])
  })

  it('при registered=true выводит все поля, контакты ссылками mailto/tel', () => {
    const rows = imprintRows(filled)
    expect(rows.map((r) => r.label)).toContain('Главный редактор')
    expect(rows.find((r) => r.label === 'E-mail редакции')?.href).toBe('mailto:red@example.test')
    expect(rows.find((r) => r.label === 'Телефон редакции')?.href).toBe('tel:+79000000000')
    expect(rows.find((r) => r.label.startsWith('Свидетельство'))?.value).toContain('Орган')
  })
})
