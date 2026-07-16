import { describe, expect, it } from 'vitest'

import productSearchIndexJson from '../../public/data/pt-BR/product-search-index.json'
import { validateProductSearchIndex } from './dataValidation'
import { searchProductIndex, searchProductIndexWithMeta } from './productSearch'

function productSearchIndex() {
  const result = validateProductSearchIndex(productSearchIndexJson)

  if (!result.ok) {
    throw new Error('Expected the generated product search index to be valid')
  }

  return result.value
}

describe('searchProductIndex', () => {
  it('finds a product by exact accent-insensitive trade name', () => {
    const results = searchProductIndex(productSearchIndex(), 'apoquel')

    expect(results[0]?.tradeName).toBe('APOQUEL')
  })

  it('finds products by current and previous registration', () => {
    expect(
      searchProductIndex(productSearchIndex(), 'SP0000728-35')
        .map((item) => item.tradeName),
    ).toContain('RIMADYL SOLUÇÃO INJETÁVEL')
    expect(
      searchProductIndex(productSearchIndex(), '6032/1997')
        .map((item) => item.tradeName),
    ).toContain("DUG'S")
  })

  it('finds commercial products by their raw source component', () => {
    const tradeNames = searchProductIndex(productSearchIndex(), 'carprofen')
      .map((item) => item.tradeName)

    expect(tradeNames).toContain('CARPROFLEX INJETÁVEL 5%')
    expect(tradeNames).toContain('RIMADYL SOLUÇÃO INJETÁVEL')
  })

  it('returns deterministic limited results and ignores empty queries', () => {
    const firstRun = searchProductIndex(productSearchIndex(), 'ivermectina', {
      limit: 5,
    })
    const secondRun = searchProductIndex(productSearchIndex(), 'ivermectina', {
      limit: 5,
    })

    expect(firstRun).toEqual(secondRun)
    expect(firstRun).toHaveLength(5)
    expect(searchProductIndex(productSearchIndex(), '   ')).toEqual([])
  })

  it('reports the complete match count when the rendered result set is limited', () => {
    const result = searchProductIndexWithMeta(productSearchIndex(), 'ivermectina', {
      limit: 3,
    })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBeGreaterThan(result.items.length)
  })
})
