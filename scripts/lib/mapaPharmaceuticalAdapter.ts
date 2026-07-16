import { createHash } from 'node:crypto'

import {
  detectDelimitedTextDelimiter,
  parseDelimitedText,
} from './delimitedText.ts'

export const MAPA_PHARMACEUTICAL_SOURCE_ID =
  'mapa-veterinary-pharmaceutical-products'

export const MAPA_PHARMACEUTICAL_EXPORT_HEADERS = [
  'Nome do Produto',
  'Forma Farmacêutica',
  'Apresentação do Produto',
  'Registro do Produto',
  'Situação do registro',
  'DT Concessão Registro',
  'DT Vencimento Registro',
  'DT Renovação do Registro do Produto',
  'Registro Anterior',
  'DT Concessão do Registro Anterior',
  'DT Validade do Registro Anterior do Produto',
  'IFA´s',
  'Insumos Homeopáticos',
  'Característica Adicional',
  'Classe Farmacêutica',
  'Espécie Animal',
  'Registro do Estabelecimento',
  'Nome  do Estabelecimento',
  'CPF/CNPJ',
  'Classificação do estabelecimento',
  'UF',
  'Grupo Atividade',
  'Validade do Produto',
  'Via Administração',
  'Modo de Uso',
  'Advertência',
  'Grupo Matéria Prima',
  'Origem',
  'Nome Fabricante',
  'País de Produção',
  'Importador',
  'Endereço do Importador',
  'Indicação',
] as const

export const MAPA_IGNORED_CLINICAL_FIELDS = [
  'Modo de Uso',
  'Advertência',
  'Indicação',
] as const

type MapaPharmaceuticalHeader =
  (typeof MAPA_PHARMACEUTICAL_EXPORT_HEADERS)[number]

export type MapaMarketingStatus =
  | 'registered'
  | 'suspended'
  | 'cancelled'
  | 'unknown'

export type MapaComponentSourceKind =
  | 'pharmaceuticalActive'
  | 'homeopathicInput'

export interface MapaPharmaceuticalSourceMetadata {
  sourceId: typeof MAPA_PHARMACEUTICAL_SOURCE_ID
  fileName: string
  byteCount: number
  contentHash: string
  retrievedAt: string
  rowCount: number
}

export interface MapaPharmaceuticalComponentCandidate {
  sourceName: string
  sourceKind: MapaComponentSourceKind
  ingredientId: null
  linkStatus: 'unmatched'
}

export interface MapaPharmaceuticalProductCandidate {
  sourceRowNumber: number
  tradeName: string
  currentRegistrationNumber: string | null
  previousRegistrationNumber: string | null
  marketingStatus: MapaMarketingStatus
  sourceStatus: string | null
  activeIngredientText: string | null
  homeopathicIngredientText: string | null
  components: MapaPharmaceuticalComponentCandidate[]
  pharmaceuticalForm: string | null
  pharmaceuticalClass: string | null
  authorizedSpecies: string[]
  holderRegistrationNumber: string | null
  holder: string | null
  routes: string[]
  origin: string | null
}

export interface MapaPharmaceuticalCandidateDataset {
  schemaVersion: '1.0.0'
  source: MapaPharmaceuticalSourceMetadata
  candidates: MapaPharmaceuticalProductCandidate[]
}

export interface MapaLegacyRegistrationReviewItem {
  sourceRowNumber: number
  tradeName: string
  previousRegistrationNumber: string | null
  sourceStatus: string | null
}

export interface MapaDuplicateRegistrationReviewItem {
  currentRegistrationNumber: string
  sourceRowNumbers: number[]
  conflictingFields: string[]
}

export interface MapaMissingIngredientReviewItem {
  sourceRowNumber: number
  tradeName: string
  currentRegistrationNumber: string | null
}

export interface MapaUnknownStatusReviewItem {
  sourceRowNumber: number
  tradeName: string
  sourceStatus: string | null
}

export interface MapaUnmatchedComponentReviewItem {
  sourceName: string
  sourceKind: MapaComponentSourceKind
  occurrenceCount: number
  sourceRowNumbers: number[]
}

export interface MapaExcludedRow {
  sourceRowNumber: number
  reasons: Array<'missingTradeName'>
}

export interface MapaPharmaceuticalImportReport {
  schemaVersion: '1.0.0'
  source: MapaPharmaceuticalSourceMetadata
  summary: {
    sourceRows: number
    candidateRows: number
    excludedRows: number
    registeredRows: number
    suspendedRows: number
    cancelledRows: number
    unknownStatusRows: number
    rowsWithoutCurrentRegistration: number
    rowsWithoutAnyIngredient: number
    duplicateRegistrationGroups: number
    unmatchedComponentValues: number
  }
  ignoredClinicalFields: readonly string[]
  exclusions: MapaExcludedRow[]
  reviewQueues: {
    legacyRegistrations: MapaLegacyRegistrationReviewItem[]
    duplicateRegistrations: MapaDuplicateRegistrationReviewItem[]
    missingIngredients: MapaMissingIngredientReviewItem[]
    unknownStatuses: MapaUnknownStatusReviewItem[]
    unmatchedComponents: MapaUnmatchedComponentReviewItem[]
  }
}

export interface MapaPharmaceuticalAdapterResult {
  dataset: MapaPharmaceuticalCandidateDataset
  report: MapaPharmaceuticalImportReport
}

export class MapaPharmaceuticalAdapterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MapaPharmaceuticalAdapterError'
  }
}

const HEADER_INDEX = new Map(
  MAPA_PHARMACEUTICAL_EXPORT_HEADERS.map((header, index) => [header, index]),
)

const DUPLICATE_CONFLICT_FIELDS: ReadonlyArray<
  keyof MapaPharmaceuticalProductCandidate
> = [
  'tradeName',
  'previousRegistrationNumber',
  'sourceStatus',
  'activeIngredientText',
  'homeopathicIngredientText',
  'pharmaceuticalForm',
  'pharmaceuticalClass',
  'authorizedSpecies',
  'holderRegistrationNumber',
  'holder',
  'routes',
  'origin',
]

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1
  }

  if (left > right) {
    return 1
  }

  return 0
}

function optionalValue(value: string): string | null {
  const trimmedValue = value.trim()
  return trimmedValue === '' || trimmedValue === '-' ? null : trimmedValue
}

function splitSourceList(value: string | null): string[] {
  if (!value) {
    return []
  }

  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
}

function sourceField(row: string[], header: MapaPharmaceuticalHeader): string {
  return row[HEADER_INDEX.get(header)!]
}

function mapMarketingStatus(sourceStatus: string | null): MapaMarketingStatus {
  switch (sourceStatus?.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase()) {
    case 'ATIVO':
      return 'registered'
    case 'SUSPENSO':
      return 'suspended'
    case 'CANCELADO':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function componentCandidates(
  activeIngredientText: string | null,
  homeopathicIngredientText: string | null,
): MapaPharmaceuticalComponentCandidate[] {
  return [
    ...splitSourceList(activeIngredientText).map((sourceName) => ({
      sourceName,
      sourceKind: 'pharmaceuticalActive' as const,
      ingredientId: null,
      linkStatus: 'unmatched' as const,
    })),
    ...splitSourceList(homeopathicIngredientText).map((sourceName) => ({
      sourceName,
      sourceKind: 'homeopathicInput' as const,
      ingredientId: null,
      linkStatus: 'unmatched' as const,
    })),
  ]
}

function assertExactSchema(headers: string[]): void {
  if (headers.length !== MAPA_PHARMACEUTICAL_EXPORT_HEADERS.length) {
    throw new MapaPharmaceuticalAdapterError(
      `Unexpected MAPA pharmaceutical schema: received ${headers.length} headers; expected ${MAPA_PHARMACEUTICAL_EXPORT_HEADERS.length}.`,
    )
  }

  for (let index = 0; index < MAPA_PHARMACEUTICAL_EXPORT_HEADERS.length; index += 1) {
    const expectedHeader = MAPA_PHARMACEUTICAL_EXPORT_HEADERS[index]
    const receivedHeader = headers[index]

    if (receivedHeader !== expectedHeader) {
      throw new MapaPharmaceuticalAdapterError(
        `Unexpected MAPA pharmaceutical header at column ${index + 1}: received ${JSON.stringify(receivedHeader)}; expected ${JSON.stringify(expectedHeader)}.`,
      )
    }
  }
}

function createCandidate(
  row: string[],
  sourceRowNumber: number,
): MapaPharmaceuticalProductCandidate | null {
  const tradeName = optionalValue(sourceField(row, 'Nome do Produto'))

  if (!tradeName) {
    return null
  }

  const sourceStatus = optionalValue(sourceField(row, 'Situação do registro'))
  const activeIngredientText = optionalValue(sourceField(row, 'IFA´s'))
  const homeopathicIngredientText = optionalValue(
    sourceField(row, 'Insumos Homeopáticos'),
  )

  return {
    sourceRowNumber,
    tradeName,
    currentRegistrationNumber: optionalValue(
      sourceField(row, 'Registro do Produto'),
    ),
    previousRegistrationNumber: optionalValue(
      sourceField(row, 'Registro Anterior'),
    ),
    marketingStatus: mapMarketingStatus(sourceStatus),
    sourceStatus,
    activeIngredientText,
    homeopathicIngredientText,
    components: componentCandidates(
      activeIngredientText,
      homeopathicIngredientText,
    ),
    pharmaceuticalForm: optionalValue(sourceField(row, 'Forma Farmacêutica')),
    pharmaceuticalClass: optionalValue(sourceField(row, 'Classe Farmacêutica')),
    authorizedSpecies: splitSourceList(
      optionalValue(sourceField(row, 'Espécie Animal')),
    ),
    holderRegistrationNumber: optionalValue(
      sourceField(row, 'Registro do Estabelecimento'),
    ),
    holder: optionalValue(sourceField(row, 'Nome  do Estabelecimento')),
    routes: splitSourceList(
      optionalValue(sourceField(row, 'Via Administração')),
    ),
    origin: optionalValue(sourceField(row, 'Origem')),
  }
}

function conflictingFields(
  candidates: MapaPharmaceuticalProductCandidate[],
): string[] {
  return DUPLICATE_CONFLICT_FIELDS.filter((field) => {
    const firstValue = JSON.stringify(candidates[0][field])
    return candidates.some((candidate) => JSON.stringify(candidate[field]) !== firstValue)
  })
}

function createDuplicateRegistrationQueue(
  candidates: MapaPharmaceuticalProductCandidate[],
): MapaDuplicateRegistrationReviewItem[] {
  const registrationGroups = new Map<
    string,
    MapaPharmaceuticalProductCandidate[]
  >()

  for (const candidate of candidates) {
    if (!candidate.currentRegistrationNumber) {
      continue
    }

    const group = registrationGroups.get(candidate.currentRegistrationNumber) ?? []
    group.push(candidate)
    registrationGroups.set(candidate.currentRegistrationNumber, group)
  }

  return [...registrationGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([currentRegistrationNumber, group]) => ({
      currentRegistrationNumber,
      sourceRowNumbers: group.map((candidate) => candidate.sourceRowNumber),
      conflictingFields: conflictingFields(group),
    }))
    .sort((left, right) =>
      compareStrings(
        left.currentRegistrationNumber,
        right.currentRegistrationNumber,
      ),
    )
}

function createUnmatchedComponentQueue(
  candidates: MapaPharmaceuticalProductCandidate[],
): MapaUnmatchedComponentReviewItem[] {
  const components = new Map<string, MapaUnmatchedComponentReviewItem>()

  for (const candidate of candidates) {
    for (const component of candidate.components) {
      const key = `${component.sourceKind}\u0000${component.sourceName}`
      const existing = components.get(key)

      if (existing) {
        existing.occurrenceCount += 1
        existing.sourceRowNumbers.push(candidate.sourceRowNumber)
      } else {
        components.set(key, {
          sourceName: component.sourceName,
          sourceKind: component.sourceKind,
          occurrenceCount: 1,
          sourceRowNumbers: [candidate.sourceRowNumber],
        })
      }
    }
  }

  return [...components.values()].sort((left, right) =>
    compareStrings(
      `${left.sourceKind}\u0000${left.sourceName}`,
      `${right.sourceKind}\u0000${right.sourceName}`,
    ),
  )
}

function sourceMetadata(
  bytes: Uint8Array,
  fileName: string,
  retrievedAt: string,
  rowCount: number,
): MapaPharmaceuticalSourceMetadata {
  return {
    sourceId: MAPA_PHARMACEUTICAL_SOURCE_ID,
    fileName,
    byteCount: bytes.byteLength,
    contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    retrievedAt,
    rowCount,
  }
}

export function adaptMapaPharmaceuticalExport(
  bytes: Uint8Array,
  fileName: string,
  retrievedAt: string,
  delimiter?: string,
): MapaPharmaceuticalAdapterResult {
  const parsedRetrievalDate = new Date(`${retrievedAt}T00:00:00.000Z`)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(retrievedAt)
    || Number.isNaN(parsedRetrievalDate.getTime())
    || parsedRetrievalDate.toISOString().slice(0, 10) !== retrievedAt
  ) {
    throw new MapaPharmaceuticalAdapterError(
      'retrievedAt must use the YYYY-MM-DD format.',
    )
  }

  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const resolvedDelimiter = delimiter ?? detectDelimitedTextDelimiter(text)
  const table = parseDelimitedText(text, resolvedDelimiter)
  assertExactSchema(table.headers)

  const candidates: MapaPharmaceuticalProductCandidate[] = []
  const exclusions: MapaExcludedRow[] = []

  table.rows.forEach((row, index) => {
    const sourceRowNumber = index + 2
    const candidate = createCandidate(row, sourceRowNumber)

    if (candidate) {
      candidates.push(candidate)
    } else {
      exclusions.push({
        sourceRowNumber,
        reasons: ['missingTradeName'],
      })
    }
  })

  const source = sourceMetadata(
    bytes,
    fileName,
    retrievedAt,
    table.rows.length,
  )
  const duplicateRegistrations = createDuplicateRegistrationQueue(candidates)
  const unmatchedComponents = createUnmatchedComponentQueue(candidates)
  const legacyRegistrations = candidates
    .filter((candidate) => !candidate.currentRegistrationNumber)
    .map((candidate) => ({
      sourceRowNumber: candidate.sourceRowNumber,
      tradeName: candidate.tradeName,
      previousRegistrationNumber: candidate.previousRegistrationNumber,
      sourceStatus: candidate.sourceStatus,
    }))
  const missingIngredients = candidates
    .filter((candidate) => candidate.components.length === 0)
    .map((candidate) => ({
      sourceRowNumber: candidate.sourceRowNumber,
      tradeName: candidate.tradeName,
      currentRegistrationNumber: candidate.currentRegistrationNumber,
    }))
  const unknownStatuses = candidates
    .filter((candidate) => candidate.marketingStatus === 'unknown')
    .map((candidate) => ({
      sourceRowNumber: candidate.sourceRowNumber,
      tradeName: candidate.tradeName,
      sourceStatus: candidate.sourceStatus,
    }))

  return {
    dataset: {
      schemaVersion: '1.0.0',
      source,
      candidates,
    },
    report: {
      schemaVersion: '1.0.0',
      source,
      summary: {
        sourceRows: table.rows.length,
        candidateRows: candidates.length,
        excludedRows: exclusions.length,
        registeredRows: candidates.filter(
          (candidate) => candidate.marketingStatus === 'registered',
        ).length,
        suspendedRows: candidates.filter(
          (candidate) => candidate.marketingStatus === 'suspended',
        ).length,
        cancelledRows: candidates.filter(
          (candidate) => candidate.marketingStatus === 'cancelled',
        ).length,
        unknownStatusRows: unknownStatuses.length,
        rowsWithoutCurrentRegistration: legacyRegistrations.length,
        rowsWithoutAnyIngredient: missingIngredients.length,
        duplicateRegistrationGroups: duplicateRegistrations.length,
        unmatchedComponentValues: unmatchedComponents.length,
      },
      ignoredClinicalFields: MAPA_IGNORED_CLINICAL_FIELDS,
      exclusions,
      reviewQueues: {
        legacyRegistrations,
        duplicateRegistrations,
        missingIngredients,
        unknownStatuses,
        unmatchedComponents,
      },
    },
  }
}
