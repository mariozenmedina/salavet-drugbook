import { describe, expect, it } from 'vitest'

import type { DrugConcept } from '../../src/types/drugbook.ts'
import type {
  MapaPharmaceuticalCandidateDataset,
  MapaPharmaceuticalProductCandidate,
} from './mapaPharmaceuticalAdapter.ts'
import {
  buildMapaProductCatalog,
  parseComponentMappingRegistry,
  parseMapaPharmaceuticalCandidateDataset,
  type ComponentMappingRegistry,
} from './mapaProductCatalogBuilder.ts'

function candidate(
  sourceRowNumber: number,
  tradeName: string,
  currentRegistrationNumber: string | null,
  previousRegistrationNumber: string | null,
  componentNames: string[],
): MapaPharmaceuticalProductCandidate {
  return {
    sourceRowNumber,
    tradeName,
    currentRegistrationNumber,
    previousRegistrationNumber,
    marketingStatus: 'registered',
    sourceStatus: 'Ativo',
    activeIngredientText: componentNames.join(',') || null,
    homeopathicIngredientText: null,
    components: componentNames.map((sourceName) => ({
      sourceName,
      sourceKind: 'pharmaceuticalActive',
      ingredientId: null,
      linkStatus: 'unmatched',
    })),
    pharmaceuticalForm: 'SOLUÇÃO',
    pharmaceuticalClass: 'CLASSE FICTÍCIA',
    authorizedSpecies: ['CANINO'],
    holderRegistrationNumber: 'EST-001',
    holder: 'ESTABELECIMENTO FICTÍCIO',
    routes: ['ORAL'],
    origin: 'NACIONAL',
  }
}

function dataset(): MapaPharmaceuticalCandidateDataset {
  return {
    schemaVersion: '1.0.0',
    source: {
      sourceId: 'mapa-veterinary-pharmaceutical-products',
      fileName: 'fixture.csv',
      byteCount: 100,
      contentHash: `sha256:${'a'.repeat(64)}`,
      retrievedAt: '2026-07-16',
      rowCount: 5,
    },
    candidates: [
      candidate(2, 'Á Produto Fictício', 'BR-001', null, ['ATIVO A']),
      candidate(3, 'Produto Fictício Candidato', 'BR-DUP', null, ['ATIVO C']),
      candidate(4, 'Produto Fictício Não Mapeado', 'BR-DUP', null, ['ATIVO X']),
      candidate(5, '123 Produto Fictício', null, 'BR-ANTERIOR-004', ['ATIVO A', 'ATIVO B']),
      candidate(6, 'Produto Fictício Sem Insumo', null, 'BR-ANTERIOR-005', []),
    ],
  }
}

function concepts(): DrugConcept[] {
  return [
    {
      id: 'ingredient-a',
      conceptType: 'ingredient',
      primaryName: 'Ativo A',
      normalizedName: 'ativo a',
      synonyms: [],
      externalIdentifiers: [],
      catalogStatus: 'verified',
      referenceIds: ['fixture-local'],
    },
    {
      id: 'ingredient-b',
      conceptType: 'ingredient',
      primaryName: 'Ativo B',
      normalizedName: 'ativo b',
      synonyms: [],
      externalIdentifiers: [],
      catalogStatus: 'verified',
      referenceIds: ['fixture-local'],
    },
    {
      id: 'ingredient-c',
      conceptType: 'ingredient',
      primaryName: 'Ativo C',
      normalizedName: 'ativo c',
      synonyms: [],
      externalIdentifiers: [],
      catalogStatus: 'verified',
      referenceIds: ['fixture-local'],
    },
    {
      id: 'combination-a-b',
      conceptType: 'combination',
      primaryName: 'Ativo A + ativo B',
      normalizedName: 'ativo a ativo b',
      synonyms: [],
      externalIdentifiers: [],
      catalogStatus: 'verified',
      referenceIds: ['fixture-local'],
      ingredientIds: ['ingredient-a', 'ingredient-b'],
    },
  ]
}

function mappings(): ComponentMappingRegistry {
  return {
    schemaVersion: '1.0.0',
    sourceId: 'mapa-veterinary-pharmaceutical-products',
    updatedAt: '2026-07-16',
    mappings: [
      {
        sourceKind: 'pharmaceuticalActive',
        sourceName: 'ATIVO A',
        ingredientId: 'ingredient-a',
        status: 'verified',
        reviewedAt: '2026-07-16',
        reviewedBy: 'fixture-reviewer',
        note: 'Fictitious exact mapping.',
      },
      {
        sourceKind: 'pharmaceuticalActive',
        sourceName: 'ATIVO B',
        ingredientId: 'ingredient-b',
        status: 'verified',
        reviewedAt: '2026-07-16',
        reviewedBy: 'fixture-reviewer',
        note: 'Fictitious exact mapping.',
      },
      {
        sourceKind: 'pharmaceuticalActive',
        sourceName: 'ATIVO C',
        ingredientId: 'ingredient-c',
        status: 'candidate',
        reviewedAt: null,
        reviewedBy: null,
        note: 'Fictitious proposed mapping.',
      },
    ],
  }
}

describe('buildMapaProductCatalog', () => {
  it('builds complete deterministic shards, manifest, and product search entries', () => {
    const result = buildMapaProductCatalog(dataset(), {
      locale: 'pt-BR',
      dataVersion: '2026.07.16.2',
      updatedAt: '2026-07-16T16:00:00Z',
      concepts: concepts(),
      mappings: mappings(),
    })

    expect(result.summary).toEqual({
      sourceRows: 5,
      products: 5,
      shards: 3,
      unmatchedProducts: 2,
      candidateProducts: 1,
      verifiedProducts: 2,
      mappedComponentOccurrences: 4,
      unmatchedComponentOccurrences: 1,
      productsWithoutCurrentRegistration: 2,
    })
    expect(result.manifest.totalCount).toBe(5)
    expect(result.manifest.shards.map((shard) => shard.id)).toEqual([
      '0-9',
      'a',
      'p',
    ])
    expect(result.searchIndex.items).toHaveLength(5)
    expect(result.searchIndex.items.map((item) => item.productId)).toEqual(
      expect.arrayContaining(result.shards.flatMap((shard) =>
        shard.items.map((product) => product.id),
      )),
    )
  })

  it('preserves nullable regulatory facts and creates distinct stable duplicate IDs', () => {
    const result = buildMapaProductCatalog(dataset(), {
      locale: 'pt-BR',
      dataVersion: '2026.07.16.2',
      updatedAt: '2026-07-16T16:00:00Z',
      concepts: concepts(),
      mappings: mappings(),
    })
    const products = result.shards.flatMap((shard) => shard.items)
    const duplicateProducts = products.filter(
      (product) => product.registrationNumber === 'BR-DUP',
    )
    const legacyProduct = products.find(
      (product) => product.previousRegistrationNumber === 'BR-ANTERIOR-004',
    )

    expect(new Set(duplicateProducts.map((product) => product.id)).size).toBe(2)
    expect(new Set(
      duplicateProducts.map((product) => product.sourceRecord.recordId),
    ).size).toBe(2)
    expect(legacyProduct).toMatchObject({
      registrationNumber: null,
      previousRegistrationNumber: 'BR-ANTERIOR-004',
      sourceRecord: {
        recordId: 'legacy:BR-ANTERIOR-004',
      },
    })
  })

  it('distinguishes verified, candidate, and unmatched component relationships', () => {
    const result = buildMapaProductCatalog(dataset(), {
      locale: 'pt-BR',
      dataVersion: '2026.07.16.2',
      updatedAt: '2026-07-16T16:00:00Z',
      concepts: concepts(),
      mappings: mappings(),
    })
    const products = result.shards.flatMap((shard) => shard.items)
    const singleVerified = products.find(
      (product) => product.tradeName === 'Á Produto Fictício',
    )
    const combinationVerified = products.find(
      (product) => product.tradeName === '123 Produto Fictício',
    )
    const candidateProduct = products.find(
      (product) => product.tradeName === 'Produto Fictício Candidato',
    )
    const unmatchedProduct = products.find(
      (product) => product.tradeName === 'Produto Fictício Não Mapeado',
    )

    expect(singleVerified).toMatchObject({
      conceptId: 'ingredient-a',
      componentLinkStatus: 'verified',
    })
    expect(combinationVerified).toMatchObject({
      conceptId: 'combination-a-b',
      componentLinkStatus: 'verified',
    })
    expect(candidateProduct).toMatchObject({
      conceptId: null,
      componentLinkStatus: 'candidate',
      components: [{ ingredientId: 'ingredient-c' }],
    })
    expect(unmatchedProduct).toMatchObject({
      conceptId: null,
      componentLinkStatus: 'unmatched',
      components: [{ ingredientId: null }],
    })
  })

  it('produces byte-identical values for identical inputs', () => {
    const options = {
      locale: 'pt-BR',
      dataVersion: '2026.07.16.2',
      updatedAt: '2026-07-16T16:00:00Z',
      concepts: concepts(),
      mappings: mappings(),
    }

    expect(JSON.stringify(buildMapaProductCatalog(dataset(), options))).toBe(
      JSON.stringify(buildMapaProductCatalog(dataset(), options)),
    )
  })

  it('keeps a registered product ID stable when its trade name changes', () => {
    const originalDataset = dataset()
    const renamedDataset = structuredClone(originalDataset)
    renamedDataset.candidates[0]!.tradeName = 'NOME COMERCIAL CORRIGIDO'
    const options = {
      locale: 'pt-BR',
      dataVersion: '2026.07.16.2',
      updatedAt: '2026-07-16T16:00:00Z',
      concepts: concepts(),
      mappings: mappings(),
    }
    const originalProduct = buildMapaProductCatalog(originalDataset, options)
      .shards.flatMap((shard) => shard.items)
      .find((product) => product.registrationNumber === 'BR-001')
    const renamedProduct = buildMapaProductCatalog(renamedDataset, options)
      .shards.flatMap((shard) => shard.items)
      .find((product) => product.registrationNumber === 'BR-001')

    expect(renamedProduct?.id).toBe(originalProduct?.id)
  })
})

describe('MAPA product catalog input parsing', () => {
  it('rejects malformed candidate datasets', () => {
    const invalidDataset = structuredClone(dataset()) as unknown as {
      candidates: Array<{ tradeName: unknown }>
    }
    invalidDataset.candidates[0]!.tradeName = null

    expect(() => parseMapaPharmaceuticalCandidateDataset(invalidDataset)).toThrow(
      '$.candidates[0].tradeName must be a non-empty string.',
    )
  })

  it('requires review metadata for verified mappings', () => {
    const invalidMappings = structuredClone(mappings())
    invalidMappings.mappings[0]!.reviewedAt = null

    expect(() => parseComponentMappingRegistry(invalidMappings)).toThrow(
      'verified mappings require reviewedAt and reviewedBy',
    )
  })
})
