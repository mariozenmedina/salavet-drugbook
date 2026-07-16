import { describe, expect, it } from 'vitest'
import searchIndexJson from '../../public/data/pt-BR/search-index.json'
import type { SearchIndexFile } from '../types/drugbook'
import { validateSearchIndex } from './dataValidation'
import { normalizeSearchText, searchDrugIndex } from './drugSearch'

function fixtureSearchIndex(): SearchIndexFile {
  const result = validateSearchIndex(searchIndexJson)

  if (!result.ok) {
    throw new Error('Expected the search fixture to be valid')
  }

  return result.value
}

describe('normalizeSearchText', () => {
  it('normalizes accents, case, punctuation, and repeated whitespace', () => {
    expect(normalizeSearchText('  CLAVULANATO + de  Potássio! ')).toBe('clavulanato de potassio')
  })
})

describe('searchDrugIndex', () => {
  it('finds accented primary names without accents', () => {
    const results = searchDrugIndex(fixtureSearchIndex(), 'potassio')

    expect(results.map((item) => item.conceptId)).toContain('ingredient-potassium-clavulanate')
  })

  it('finds concepts by synonym regardless of case', () => {
    const results = searchDrugIndex(fixtureSearchIndex(), 'CARPROFEN')

    expect(results.map((item) => item.conceptId)).toEqual(['ingredient-carprofen'])
  })

  it('finds every verified relationship by trade name', () => {
    const results = searchDrugIndex(fixtureSearchIndex(), 'Produto Exemplo AC')

    expect(results.map((item) => item.conceptId)).toEqual([
      'ingredient-amoxicillin',
      'combination-amoxicillin-clavulanate',
      'ingredient-potassium-clavulanate',
    ])
  })

  it('matches multiple query tokens across combination components', () => {
    const results = searchDrugIndex(fixtureSearchIndex(), 'amoxicilina potassio')

    expect(results.map((item) => item.conceptId)).toEqual(['combination-amoxicillin-clavulanate'])
  })

  it('returns deterministic limited results and ignores empty queries', () => {
    expect(searchDrugIndex(fixtureSearchIndex(), 'produto', { limit: 1 })).toHaveLength(1)
    expect(searchDrugIndex(fixtureSearchIndex(), '   ')).toEqual([])
  })
})
