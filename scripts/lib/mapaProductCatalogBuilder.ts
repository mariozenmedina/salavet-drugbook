import { createHash } from 'node:crypto'

import type {
  CommercialProduct,
  DrugConcept,
  MarketingStatus,
  ProductCatalogManifest,
  ProductSearchIndexFile,
  ProductShard,
} from '../../src/types/drugbook.ts'
import {
  MAPA_PHARMACEUTICAL_SOURCE_ID,
  type MapaComponentSourceKind,
  type MapaPharmaceuticalCandidateDataset,
  type MapaPharmaceuticalProductCandidate,
} from './mapaPharmaceuticalAdapter.ts'

export interface ComponentMappingDecision {
  sourceKind: MapaComponentSourceKind
  sourceName: string
  ingredientId: string
  status: 'candidate' | 'verified'
  reviewedAt: string | null
  reviewedBy: string | null
  note: string
}

export interface ComponentMappingRegistry {
  schemaVersion: '1.0.0'
  sourceId: typeof MAPA_PHARMACEUTICAL_SOURCE_ID
  updatedAt: string
  mappings: ComponentMappingDecision[]
}

export interface MapaProductCatalogBuildOptions {
  locale: string
  dataVersion: string
  updatedAt: string
  concepts: DrugConcept[]
  mappings: ComponentMappingRegistry
}

export interface MapaProductCatalogBuildSummary {
  sourceRows: number
  products: number
  shards: number
  unmatchedProducts: number
  candidateProducts: number
  verifiedProducts: number
  mappedComponentOccurrences: number
  unmatchedComponentOccurrences: number
  productsWithoutCurrentRegistration: number
}

export interface MapaProductCatalogBuildResult {
  manifest: ProductCatalogManifest
  searchIndex: ProductSearchIndexFile
  shards: ProductShard[]
  summary: MapaProductCatalogBuildSummary
}

export class MapaProductCatalogBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MapaProductCatalogBuildError'
  }
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function expectRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) {
    throw new MapaProductCatalogBuildError(`${path} must be an object.`)
  }

  return value
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MapaProductCatalogBuildError(`${path} must be a non-empty string.`)
  }

  return value
}

function expectNullableString(value: unknown, path: string): string | null {
  if (value === null) {
    return null
  }

  return expectString(value, path)
}

function expectStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new MapaProductCatalogBuildError(`${path} must be an array.`)
  }

  return value.map((item, index) => expectString(item, `${path}[${index}]`))
}

function expectEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new MapaProductCatalogBuildError(
      `${path} must be one of: ${values.join(', ')}.`,
    )
  }

  return value as T
}

function validateCandidate(value: unknown, index: number): void {
  const path = `$.candidates[${index}]`
  const record = expectRecord(value, path)

  if (!Number.isInteger(record.sourceRowNumber) || Number(record.sourceRowNumber) < 2) {
    throw new MapaProductCatalogBuildError(
      `${path}.sourceRowNumber must be an integer greater than one.`,
    )
  }

  expectString(record.tradeName, `${path}.tradeName`)
  expectNullableString(
    record.currentRegistrationNumber,
    `${path}.currentRegistrationNumber`,
  )
  expectNullableString(
    record.previousRegistrationNumber,
    `${path}.previousRegistrationNumber`,
  )
  expectEnum(
    record.marketingStatus,
    ['registered', 'suspended', 'cancelled', 'unknown'] as const,
    `${path}.marketingStatus`,
  )
  expectNullableString(record.sourceStatus, `${path}.sourceStatus`)
  expectNullableString(record.activeIngredientText, `${path}.activeIngredientText`)
  expectNullableString(
    record.homeopathicIngredientText,
    `${path}.homeopathicIngredientText`,
  )
  expectNullableString(record.pharmaceuticalForm, `${path}.pharmaceuticalForm`)
  expectNullableString(record.pharmaceuticalClass, `${path}.pharmaceuticalClass`)
  expectStringArray(record.authorizedSpecies, `${path}.authorizedSpecies`)
  expectNullableString(
    record.holderRegistrationNumber,
    `${path}.holderRegistrationNumber`,
  )
  expectNullableString(record.holder, `${path}.holder`)
  expectStringArray(record.routes, `${path}.routes`)
  expectNullableString(record.origin, `${path}.origin`)

  if (!Array.isArray(record.components)) {
    throw new MapaProductCatalogBuildError(`${path}.components must be an array.`)
  }

  record.components.forEach((component, componentIndex) => {
    const componentPath = `${path}.components[${componentIndex}]`
    const componentRecord = expectRecord(component, componentPath)
    expectString(componentRecord.sourceName, `${componentPath}.sourceName`)
    expectEnum(
      componentRecord.sourceKind,
      ['pharmaceuticalActive', 'homeopathicInput'] as const,
      `${componentPath}.sourceKind`,
    )
  })
}

export function parseMapaPharmaceuticalCandidateDataset(
  value: unknown,
): MapaPharmaceuticalCandidateDataset {
  const record = expectRecord(value, '$')
  const source = expectRecord(record.source, '$.source')

  if (record.schemaVersion !== '1.0.0') {
    throw new MapaProductCatalogBuildError(
      '$.schemaVersion must equal "1.0.0".',
    )
  }

  if (source.sourceId !== MAPA_PHARMACEUTICAL_SOURCE_ID) {
    throw new MapaProductCatalogBuildError(
      `$.source.sourceId must equal ${JSON.stringify(MAPA_PHARMACEUTICAL_SOURCE_ID)}.`,
    )
  }

  expectString(source.fileName, '$.source.fileName')
  expectString(source.contentHash, '$.source.contentHash')
  expectString(source.retrievedAt, '$.source.retrievedAt')

  if (!Number.isInteger(source.byteCount) || Number(source.byteCount) < 1) {
    throw new MapaProductCatalogBuildError(
      '$.source.byteCount must be a positive integer.',
    )
  }

  if (!Number.isInteger(source.rowCount) || Number(source.rowCount) < 0) {
    throw new MapaProductCatalogBuildError(
      '$.source.rowCount must be a non-negative integer.',
    )
  }

  if (!Array.isArray(record.candidates)) {
    throw new MapaProductCatalogBuildError('$.candidates must be an array.')
  }

  record.candidates.forEach(validateCandidate)

  const rowNumbers = record.candidates.map((candidate) =>
    Number((candidate as JsonRecord).sourceRowNumber),
  )

  if (new Set(rowNumbers).size !== rowNumbers.length) {
    throw new MapaProductCatalogBuildError(
      '$.candidates contains duplicate sourceRowNumber values.',
    )
  }

  return value as MapaPharmaceuticalCandidateDataset
}

function parseMapping(value: unknown, index: number): ComponentMappingDecision {
  const path = `$.mappings[${index}]`
  const record = expectRecord(value, path)
  const status = expectEnum(
    record.status,
    ['candidate', 'verified'] as const,
    `${path}.status`,
  )
  const reviewedAt = expectNullableString(record.reviewedAt, `${path}.reviewedAt`)
  const reviewedBy = expectNullableString(record.reviewedBy, `${path}.reviewedBy`)

  if (status === 'verified' && (!reviewedAt || !reviewedBy)) {
    throw new MapaProductCatalogBuildError(
      `${path} verified mappings require reviewedAt and reviewedBy.`,
    )
  }

  return {
    sourceKind: expectEnum(
      record.sourceKind,
      ['pharmaceuticalActive', 'homeopathicInput'] as const,
      `${path}.sourceKind`,
    ),
    sourceName: expectString(record.sourceName, `${path}.sourceName`),
    ingredientId: expectString(record.ingredientId, `${path}.ingredientId`),
    status,
    reviewedAt,
    reviewedBy,
    note: expectString(record.note, `${path}.note`),
  }
}

export function parseComponentMappingRegistry(
  value: unknown,
): ComponentMappingRegistry {
  const record = expectRecord(value, '$')

  if (record.schemaVersion !== '1.0.0') {
    throw new MapaProductCatalogBuildError(
      '$.schemaVersion must equal "1.0.0".',
    )
  }

  if (record.sourceId !== MAPA_PHARMACEUTICAL_SOURCE_ID) {
    throw new MapaProductCatalogBuildError(
      `$.sourceId must equal ${JSON.stringify(MAPA_PHARMACEUTICAL_SOURCE_ID)}.`,
    )
  }

  if (!Array.isArray(record.mappings)) {
    throw new MapaProductCatalogBuildError('$.mappings must be an array.')
  }

  const mappings = record.mappings.map(parseMapping)
  const mappingKeys = mappings.map(mappingKey)

  if (new Set(mappingKeys).size !== mappingKeys.length) {
    throw new MapaProductCatalogBuildError(
      '$.mappings contains duplicate source kind and name keys.',
    )
  }

  return {
    schemaVersion: '1.0.0',
    sourceId: MAPA_PHARMACEUTICAL_SOURCE_ID,
    updatedAt: expectString(record.updatedAt, '$.updatedAt'),
    mappings,
  }
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function slugify(value: string): string {
  return normalizeSearchText(value).replaceAll(' ', '-').slice(0, 64) || 'produto'
}

function shortHash(value: string, length = 12): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length)
}

function mappingKey(mapping: {
  sourceKind: MapaComponentSourceKind
  sourceName: string
}): string {
  return `${mapping.sourceKind}\u0000${mapping.sourceName}`
}

function fingerprintCandidate(
  candidate: MapaPharmaceuticalProductCandidate,
): string {
  return JSON.stringify({
    tradeName: candidate.tradeName,
    currentRegistrationNumber: candidate.currentRegistrationNumber,
    previousRegistrationNumber: candidate.previousRegistrationNumber,
    marketingStatus: candidate.marketingStatus,
    components: candidate.components.map(({ sourceKind, sourceName }) => ({
      sourceKind,
      sourceName,
    })),
    pharmaceuticalForm: candidate.pharmaceuticalForm,
    pharmaceuticalClass: candidate.pharmaceuticalClass,
    authorizedSpecies: candidate.authorizedSpecies,
    holderRegistrationNumber: candidate.holderRegistrationNumber,
    holder: candidate.holder,
    routes: candidate.routes,
    origin: candidate.origin,
  })
}

function candidateIdentityBase(
  candidate: MapaPharmaceuticalProductCandidate,
): string {
  if (candidate.currentRegistrationNumber) {
    return `registration:${candidate.currentRegistrationNumber}`
  }

  if (candidate.previousRegistrationNumber) {
    return `legacy:${candidate.previousRegistrationNumber}`
  }

  return `unregistered:${normalizeSearchText(candidate.tradeName)}`
}

function createRecordIds(
  candidates: MapaPharmaceuticalProductCandidate[],
): Map<number, string> {
  const baseCounts = new Map<string, number>()

  for (const candidate of candidates) {
    const base = candidateIdentityBase(candidate)
    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1)
  }

  const occurrenceCounts = new Map<string, number>()
  const recordIds = new Map<number, string>()

  for (const candidate of candidates) {
    const base = candidateIdentityBase(candidate)

    if (
      baseCounts.get(base) === 1
      && (candidate.currentRegistrationNumber || candidate.previousRegistrationNumber)
    ) {
      recordIds.set(
        candidate.sourceRowNumber,
        candidate.currentRegistrationNumber ?? base,
      )
      continue
    }

    const fingerprint = shortHash(fingerprintCandidate(candidate))
    const occurrenceKey = `${base}\u0000${fingerprint}`
    const occurrence = (occurrenceCounts.get(occurrenceKey) ?? 0) + 1
    occurrenceCounts.set(occurrenceKey, occurrence)
    recordIds.set(
      candidate.sourceRowNumber,
      `${base}#${fingerprint}${occurrence > 1 ? `-${occurrence}` : ''}`,
    )
  }

  return recordIds
}

function shardIdFor(value: string): string {
  const firstCharacter = normalizeSearchText(value)[0]

  if (!firstCharacter) {
    return 'other'
  }

  if (/[0-9]/.test(firstCharacter)) {
    return '0-9'
  }

  return /[a-z]/.test(firstCharacter) ? firstCharacter : 'other'
}

function shardLabel(shardId: string): string {
  if (shardId === '0-9') {
    return '0–9'
  }

  if (shardId === 'other') {
    return '#'
  }

  return shardId.toUpperCase()
}

function uniqueStrings(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))]
}

function productSortKey(product: CommercialProduct): string {
  return `${normalizeSearchText(product.tradeName)}\u0000${product.tradeName}\u0000${product.id}`
}

function validateMappings(
  dataset: MapaPharmaceuticalCandidateDataset,
  options: MapaProductCatalogBuildOptions,
): Map<string, ComponentMappingDecision> {
  const conceptMap = new Map(options.concepts.map((concept) => [concept.id, concept]))
  const sourceComponentKeys = new Set(
    dataset.candidates.flatMap((candidate) =>
      candidate.components.map((component) => mappingKey(component)),
    ),
  )
  const mappingMap = new Map<string, ComponentMappingDecision>()

  for (const mapping of options.mappings.mappings) {
    const key = mappingKey(mapping)
    const concept = conceptMap.get(mapping.ingredientId)

    if (!sourceComponentKeys.has(key)) {
      throw new MapaProductCatalogBuildError(
        `Mapping source value is not present in the candidate dataset: ${mapping.sourceName}.`,
      )
    }

    if (!concept) {
      throw new MapaProductCatalogBuildError(
        `Mapping targets unknown concept ID: ${mapping.ingredientId}.`,
      )
    }

    if (concept.conceptType !== 'ingredient') {
      throw new MapaProductCatalogBuildError(
        `Mapping target must be an ingredient concept: ${mapping.ingredientId}.`,
      )
    }

    mappingMap.set(key, mapping)
  }

  return mappingMap
}

function combinationConcepts(concepts: DrugConcept[]): Map<string, string> {
  const combinations = new Map<string, string>()

  for (const concept of concepts) {
    if (concept.conceptType !== 'combination') {
      continue
    }

    const key = [...concept.ingredientIds].sort(compareStrings).join('|')

    if (combinations.has(key)) {
      throw new MapaProductCatalogBuildError(
        `Multiple combination concepts use the same ingredient set: ${key}.`,
      )
    }

    combinations.set(key, concept.id)
  }

  return combinations
}

function buildProduct(
  candidate: MapaPharmaceuticalProductCandidate,
  recordId: string,
  mappingMap: Map<string, ComponentMappingDecision>,
  combinationMap: Map<string, string>,
  source: MapaPharmaceuticalCandidateDataset['source'],
): CommercialProduct {
  const mappingDecisions = candidate.components.map((component) =>
    mappingMap.get(mappingKey(component)) ?? null,
  )
  const components = candidate.components.map((component, index) => ({
    ingredientId: mappingDecisions[index]?.ingredientId ?? null,
    sourceIngredientName: component.sourceName,
    role: 'active' as const,
    strength: null,
  }))
  const allMapped = components.length > 0
    && components.every((component) => component.ingredientId !== null)
  const allVerified = allMapped
    && mappingDecisions.every((mapping) => mapping?.status === 'verified')
  const ingredientIds = components
    .map((component) => component.ingredientId)
    .filter((ingredientId): ingredientId is string => ingredientId !== null)
  const uniqueIngredientIds = [...new Set(ingredientIds)].sort(compareStrings)
  let conceptId: string | null = null

  if (allVerified && components.length === 1) {
    conceptId = ingredientIds[0]
  } else if (
    allVerified
    && uniqueIngredientIds.length === components.length
    && components.length > 1
  ) {
    conceptId = combinationMap.get(uniqueIngredientIds.join('|')) ?? null
  }

  const mappedComponentCount = components.filter(
    (component) => component.ingredientId !== null,
  ).length
  const componentLinkStatus = conceptId
    ? 'verified'
    : mappedComponentCount > 0
      ? 'candidate'
      : 'unmatched'
  const productId = `product-mapa-${slugify(recordId)}-${shortHash(recordId)}`

  return {
    id: productId,
    tradeName: candidate.tradeName,
    jurisdiction: 'BR',
    regulatoryAuthority: 'MAPA',
    registrationNumber: candidate.currentRegistrationNumber,
    previousRegistrationNumber: candidate.previousRegistrationNumber,
    marketingStatus: candidate.marketingStatus as MarketingStatus,
    holderRegistrationNumber: candidate.holderRegistrationNumber,
    holder: candidate.holder,
    conceptId,
    components,
    componentLinkStatus,
    dosageForms: uniqueStrings([candidate.pharmaceuticalForm]),
    pharmaceuticalClasses: uniqueStrings([candidate.pharmaceuticalClass]),
    routes: [...candidate.routes],
    authorizedSpecies: [...candidate.authorizedSpecies],
    origin: candidate.origin,
    sourceRecord: {
      sourceId: MAPA_PHARMACEUTICAL_SOURCE_ID,
      recordId,
      retrievedAt: source.retrievedAt,
      contentHash: source.contentHash,
    },
  }
}

export function buildMapaProductCatalog(
  dataset: MapaPharmaceuticalCandidateDataset,
  options: MapaProductCatalogBuildOptions,
): MapaProductCatalogBuildResult {
  if (dataset.source.sourceId !== MAPA_PHARMACEUTICAL_SOURCE_ID) {
    throw new MapaProductCatalogBuildError('Unexpected candidate source ID.')
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(options.updatedAt)) {
    throw new MapaProductCatalogBuildError(
      'updatedAt must use the YYYY-MM-DDTHH:mm:ssZ format.',
    )
  }

  const mappingMap = validateMappings(dataset, options)
  const combinationMap = combinationConcepts(options.concepts)
  const recordIds = createRecordIds(dataset.candidates)
  const products = dataset.candidates.map((candidate) =>
    buildProduct(
      candidate,
      recordIds.get(candidate.sourceRowNumber)!,
      mappingMap,
      combinationMap,
      dataset.source,
    ),
  )
  const productIds = products.map((product) => product.id)
  const sourceRecordIds = products.map((product) => product.sourceRecord.recordId)

  if (new Set(productIds).size !== productIds.length) {
    throw new MapaProductCatalogBuildError('Generated duplicate product IDs.')
  }

  if (new Set(sourceRecordIds).size !== sourceRecordIds.length) {
    throw new MapaProductCatalogBuildError('Generated duplicate source record IDs.')
  }

  const shardMap = new Map<string, CommercialProduct[]>()

  for (const product of products) {
    const shardId = shardIdFor(product.tradeName)
    const shardProducts = shardMap.get(shardId) ?? []
    shardProducts.push(product)
    shardMap.set(shardId, shardProducts)
  }

  const shardIds = [...shardMap.keys()].sort(compareStrings)
  const shards = shardIds.map((shardId) => ({
    locale: options.locale,
    letter: shardId,
    updatedAt: options.updatedAt,
    items: shardMap.get(shardId)!.sort((left, right) =>
      compareStrings(productSortKey(left), productSortKey(right)),
    ),
  }))
  const searchItems = products
    .map((product) => ({
      productId: product.id,
      tradeName: product.tradeName,
      normalizedTradeName: normalizeSearchText(product.tradeName),
      registrationNumber: product.registrationNumber,
      previousRegistrationNumber: product.previousRegistrationNumber,
      marketingStatus: product.marketingStatus,
      holder: product.holder,
      componentNames: uniqueStrings(
        product.components.map((component) => component.sourceIngredientName),
      ),
      pharmaceuticalClasses: [...product.pharmaceuticalClasses],
      species: [...product.authorizedSpecies],
      shard: shardIdFor(product.tradeName),
      path: `/${options.locale}/product/${product.id}`,
    }))
    .sort((left, right) =>
      compareStrings(
        `${left.normalizedTradeName}\u0000${left.tradeName}\u0000${left.productId}`,
        `${right.normalizedTradeName}\u0000${right.tradeName}\u0000${right.productId}`,
      ),
    )
  const mappedComponentOccurrences = products.reduce(
    (count, product) => count
      + product.components.filter((component) => component.ingredientId !== null).length,
    0,
  )
  const totalComponentOccurrences = products.reduce(
    (count, product) => count + product.components.length,
    0,
  )

  return {
    manifest: {
      locale: options.locale,
      schemaVersion: '1.0.0',
      dataVersion: options.dataVersion,
      updatedAt: options.updatedAt,
      sourceId: MAPA_PHARMACEUTICAL_SOURCE_ID,
      totalCount: products.length,
      shards: shards.map((shard) => ({
        id: shard.letter,
        label: shardLabel(shard.letter),
        path: `/data/${options.locale}/catalog/products/${shard.letter}.json`,
        count: shard.items.length,
      })),
    },
    searchIndex: {
      locale: options.locale,
      schemaVersion: '1.0.0',
      dataVersion: options.dataVersion,
      updatedAt: options.updatedAt,
      items: searchItems,
    },
    shards,
    summary: {
      sourceRows: dataset.source.rowCount,
      products: products.length,
      shards: shards.length,
      unmatchedProducts: products.filter(
        (product) => product.componentLinkStatus === 'unmatched',
      ).length,
      candidateProducts: products.filter(
        (product) => product.componentLinkStatus === 'candidate',
      ).length,
      verifiedProducts: products.filter(
        (product) => product.componentLinkStatus === 'verified',
      ).length,
      mappedComponentOccurrences,
      unmatchedComponentOccurrences:
        totalComponentOccurrences - mappedComponentOccurrences,
      productsWithoutCurrentRegistration: products.filter(
        (product) => product.registrationNumber === null,
      ).length,
    },
  }
}
