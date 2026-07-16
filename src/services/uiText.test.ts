import { describe, expect, it } from 'vitest'
import { formatUiText } from './uiText'

describe('formatUiText', () => {
  it('substitutes named values without changing unknown placeholders', () => {
    expect(formatUiText('{shown} de {total}: {unknown}', { shown: 12, total: 30 })).toBe(
      '12 de 30: {unknown}',
    )
  })
})
