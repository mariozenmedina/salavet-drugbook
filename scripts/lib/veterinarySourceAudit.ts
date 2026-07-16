import { createHash } from 'node:crypto'

import { parseDelimitedText } from './delimitedText.ts'

const SIPEAGRO_ESTABLISHMENT_HEADERS = [
  'UNIDADE_DA_FEDERACAO',
  'MUNICIPIO',
  'NUMERO_REGISTRO_ESTABELECIMENTO',
  'STATUS_DO_REGISTRO',
  'CNPJ',
  'RAZAO_SOCIAL',
  'NOME_FANTASIA',
  'AREA_ATUACAO',
  'ATIVIDADE',
  'CLASSIFICACAO',
  'CARACTERISTICA_ADICIONAL',
] as const

const PRODUCT_FIELD_ALIASES = {
  activeIngredients: [
    'COMPOSICAO',
    'INGREDIENTE_ATIVO',
    'INGREDIENTES_ATIVOS',
    'PRINCIPIO_ATIVO',
    'PRINCIPIOS_ATIVOS',
  ],
  registrationNumber: [
    'NUMERO_DO_REGISTRO',
    'NUMERO_REGISTRO',
    'NUMERO_REGISTRO_PRODUTO',
    'REGISTRO_MAPA',
    'REGISTRO_PRODUTO',
  ],
  tradeName: [
    'NOME_COMERCIAL',
    'NOME_DO_PRODUTO',
    'NOME_PRODUTO',
    'PRODUTO',
  ],
} as const

export type VeterinarySourceSchema =
  | 'product-catalog-candidate'
  | 'sipeagro-establishment-catalog'
  | 'unknown'

export interface VeterinarySourceAuditReport {
  schemaVersion: '1.0.0'
  source: {
    fileName: string
    byteCount: number
    contentHash: string
  }
  format: {
    encoding: 'utf-8'
    delimiter: string
    headers: string[]
    rowCount: number
  }
  classification: {
    schema: VeterinarySourceSchema
    canProceedToProductMapping: boolean
    recognizedFields: {
      activeIngredients: string | null
      registrationNumber: string | null
      tradeName: string | null
    }
    blockingReasons: string[]
  }
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function findRecognizedHeader(
  normalizedHeaders: Map<string, string>,
  aliases: readonly string[],
): string | null {
  for (const alias of aliases) {
    const originalHeader = normalizedHeaders.get(alias)

    if (originalHeader) {
      return originalHeader
    }
  }

  return null
}

function matchesEstablishmentSchema(headers: string[]): boolean {
  return headers.length === SIPEAGRO_ESTABLISHMENT_HEADERS.length
    && SIPEAGRO_ESTABLISHMENT_HEADERS.every(
      (header, index) => normalizeHeader(headers[index]) === header,
    )
}

export function auditVeterinaryProductSource(
  bytes: Uint8Array,
  fileName: string,
  delimiter = ';',
): VeterinarySourceAuditReport {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const table = parseDelimitedText(text, delimiter)
  const normalizedHeaders = new Map(
    table.headers.map((header) => [normalizeHeader(header), header]),
  )
  const recognizedFields = {
    activeIngredients: findRecognizedHeader(
      normalizedHeaders,
      PRODUCT_FIELD_ALIASES.activeIngredients,
    ),
    registrationNumber: findRecognizedHeader(
      normalizedHeaders,
      PRODUCT_FIELD_ALIASES.registrationNumber,
    ),
    tradeName: findRecognizedHeader(
      normalizedHeaders,
      PRODUCT_FIELD_ALIASES.tradeName,
    ),
  }
  const establishmentSchema = matchesEstablishmentSchema(table.headers)
  const blockingReasons: string[] = []

  if (establishmentSchema) {
    blockingReasons.push(
      'The file matches the SIPEAGRO establishment schema and contains no product-level records.',
    )
  } else {
    if (!recognizedFields.tradeName) {
      blockingReasons.push('Missing a recognized product trade-name column.')
    }

    if (!recognizedFields.registrationNumber) {
      blockingReasons.push('Missing a recognized product registration-number column.')
    }

    if (!recognizedFields.activeIngredients) {
      blockingReasons.push('Missing a recognized active-ingredient or composition column.')
    }

    if (table.rows.length === 0) {
      blockingReasons.push('The file contains no data rows.')
    }
  }

  const canProceedToProductMapping = blockingReasons.length === 0
  const schema: VeterinarySourceSchema = establishmentSchema
    ? 'sipeagro-establishment-catalog'
    : canProceedToProductMapping
      ? 'product-catalog-candidate'
      : 'unknown'

  return {
    schemaVersion: '1.0.0',
    source: {
      fileName,
      byteCount: bytes.byteLength,
      contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    },
    format: {
      encoding: 'utf-8',
      delimiter,
      headers: table.headers,
      rowCount: table.rows.length,
    },
    classification: {
      schema,
      canProceedToProductMapping,
      recognizedFields,
      blockingReasons,
    },
  }
}
