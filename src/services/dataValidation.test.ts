import { describe, expect, it } from 'vitest'
import sourceRegistryJson from '../../data/source-registry.json'
import conceptsAJson from '../../public/data/pt-BR/catalog/concepts/a.json'
import conceptsCJson from '../../public/data/pt-BR/catalog/concepts/c.json'
import productsAJson from '../../public/data/pt-BR/catalog/products/a.json'
import productsCJson from '../../public/data/pt-BR/catalog/products/c.json'
import letterAJson from '../../public/data/pt-BR/letters/a.json'
import letterCJson from '../../public/data/pt-BR/letters/c.json'
import monographJson from '../../public/data/pt-BR/monographs/carprofeno.json'
import searchIndexJson from '../../public/data/pt-BR/search-index.json'
import type {
  ConceptShard,
  DrugMonograph,
  DrugbookDatasetRelations,
  LetterFile,
  ProductShard,
  SearchIndexFile,
} from '../types/drugbook'
import {
  validateConceptShard,
  validateDatasetRelations,
  validateDrugMonograph,
  validateLetterFile,
  validateProductShard,
  validateSearchIndex,
  validateSourceRegistry,
  type ValidationResult,
} from './dataValidation'

function requireValid<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error('Expected fixture validation to pass')
  }

  return result.value
}

function fixtureRelations(): DrugbookDatasetRelations {
  const sourceRegistry = requireValid(validateSourceRegistry(structuredClone(sourceRegistryJson)))
  const conceptsA = requireValid<ConceptShard>(validateConceptShard(structuredClone(conceptsAJson)))
  const conceptsC = requireValid<ConceptShard>(validateConceptShard(structuredClone(conceptsCJson)))
  const productsA = requireValid<ProductShard>(validateProductShard(structuredClone(productsAJson)))
  const productsC = requireValid<ProductShard>(validateProductShard(structuredClone(productsCJson)))
  const letterA = requireValid<LetterFile>(validateLetterFile(structuredClone(letterAJson)))
  const letterC = requireValid<LetterFile>(validateLetterFile(structuredClone(letterCJson)))
  const searchIndex = requireValid<SearchIndexFile>(validateSearchIndex(structuredClone(searchIndexJson)))
  const monograph = requireValid<DrugMonograph>(validateDrugMonograph(structuredClone(monographJson)))

  return {
    sources: sourceRegistry.sources,
    concepts: [...conceptsA.items, ...conceptsC.items],
    products: [...productsA.items, ...productsC.items],
    letters: [letterA, letterC],
    searchIndex,
    monographs: [monograph],
  }
}

describe('drugbook data validation', () => {
  it('validates the complete fixture dataset and its relationships', () => {
    const result = validateDatasetRelations(fixtureRelations())

    expect(result).toEqual({
      ok: true,
      value: expect.any(Object),
    })
  })

  it('reports the exact JSON path for invalid fields', () => {
    const invalidSearchIndex = structuredClone(searchIndexJson) as unknown as {
      items: Array<{ conceptId: unknown }>
    }
    invalidSearchIndex.items[0]!.conceptId = 42

    const result = validateSearchIndex(invalidSearchIndex)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.issues).toContainEqual({
        path: '$.items[0].conceptId',
        message: 'Expected a string',
      })
    }
  })

  it('rejects a reviewed monograph without review metadata', () => {
    const invalidMonograph = structuredClone(monographJson) as unknown as {
      monographStatus: string
      review: null
    }
    invalidMonograph.monographStatus = 'reviewed'

    const result = validateDrugMonograph(invalidMonograph)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.issues).toContainEqual({
        path: '$.review',
        message: 'Reviewed monographs require review metadata',
      })
    }
  })

  it('detects broken product-to-concept relationships', () => {
    const relations = fixtureRelations()
    relations.products[0]!.conceptId = 'ingredient-does-not-exist'

    const result = validateDatasetRelations(relations)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message.includes('Unknown concept ID'))).toBe(true)
    }
  })

  it('requires deterministic sorted combination components', () => {
    const relations = fixtureRelations()
    const combination = relations.concepts.find((concept) => concept.conceptType === 'combination')

    if (!combination || combination.conceptType !== 'combination') {
      throw new Error('Expected a combination fixture')
    }

    combination.ingredientIds.reverse()
    const result = validateDatasetRelations(relations)

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message === 'Combination ingredient IDs must be sorted')).toBe(
        true,
      )
    }
  })
})
