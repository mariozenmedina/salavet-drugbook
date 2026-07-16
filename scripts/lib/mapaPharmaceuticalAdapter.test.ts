import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  adaptMapaPharmaceuticalExport,
  MAPA_PHARMACEUTICAL_EXPORT_HEADERS,
  MapaPharmaceuticalAdapterError,
} from './mapaPharmaceuticalAdapter.ts'

type Header = (typeof MAPA_PHARMACEUTICAL_EXPORT_HEADERS)[number]
type SourceRow = Partial<Record<Header, string>>

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function sourceBytes(rows: SourceRow[]): Uint8Array {
  const lines = [
    MAPA_PHARMACEUTICAL_EXPORT_HEADERS.map(escapeCsv).join(','),
    ...rows.map((row) =>
      MAPA_PHARMACEUTICAL_EXPORT_HEADERS
        .map((header) => escapeCsv(row[header] ?? ''))
        .join(','),
    ),
  ]

  return new TextEncoder().encode(`${lines.join('\n')}\n`)
}

function qualityFixtureBytes(): Uint8Array {
  return sourceBytes([
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO A',
      'Registro do Produto': 'BR-001',
      'Situação do registro': 'Ativo',
      'IFA´s': 'ATIVO A,ATIVO B',
      'Forma Farmacêutica': 'SOLUÇÃO',
      'Classe Farmacêutica': 'CLASSE A',
      'Espécie Animal': 'BOVINO,CANINO',
      'Registro do Estabelecimento': 'EST-001',
      'Nome  do Estabelecimento': 'ESTABELECIMENTO A',
      'Via Administração': 'ORAL',
      'Modo de Uso': 'LINHA FICTÍCIA 1\nLINHA FICTÍCIA 2',
      'Advertência': 'ADVERTÊNCIA FICTÍCIA',
      Indicação: 'INDICAÇÃO FICTÍCIA',
      Origem: 'NACIONAL',
    },
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO LEGADO',
      'Registro do Produto': '-',
      'Situação do registro': 'Ativo',
      'Registro Anterior': 'BR-ANTERIOR-002',
      'IFA´s': 'ATIVO C',
    },
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO DUPLICADO',
      'Registro do Produto': 'BR-DUP',
      'Situação do registro': 'Ativo',
      'IFA´s': 'ATIVO D',
      'Espécie Animal': 'BOVINO',
    },
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO DUPLICADO',
      'Registro do Produto': 'BR-DUP',
      'Situação do registro': 'Ativo',
      'IFA´s': 'ATIVO E',
      'Espécie Animal': 'CANINO',
    },
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO SEM INSUMO',
      'Registro do Produto': 'BR-005',
      'Situação do registro': 'Suspenso',
      'IFA´s': '-',
      'Insumos Homeopáticos': '-',
    },
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO HOMEOPÁTICO',
      'Registro do Produto': 'BR-006',
      'Situação do registro': 'Cancelado',
      'Insumos Homeopáticos': 'INSUMO HOMEOPÁTICO H',
    },
    {
      'Nome do Produto': 'PRODUTO FICTÍCIO STATUS NOVO',
      'Registro do Produto': 'BR-007',
      'Situação do registro': 'Em análise',
      'IFA´s': 'ATIVO A',
    },
    {
      'Registro do Produto': 'BR-008',
      'Situação do registro': 'Ativo',
      'IFA´s': 'ATIVO EXCLUÍDO',
    },
  ])
}

describe('adaptMapaPharmaceuticalExport', () => {
  it('adapts the committed full-schema fictitious fixture', () => {
    const bytes = readFileSync(
      resolve(
        'tests',
        'fixtures',
        'sources',
        'mapa-pharmaceutical-export.csv',
      ),
    )
    const result = adaptMapaPharmaceuticalExport(
      bytes,
      'mapa-pharmaceutical-export.csv',
      '2026-07-16',
    )

    expect(result.dataset.source).toMatchObject({
      sourceId: 'mapa-veterinary-pharmaceutical-products',
      fileName: 'mapa-pharmaceutical-export.csv',
      rowCount: 1,
    })
    expect(result.dataset.source.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result.dataset.candidates[0]).toMatchObject({
      sourceRowNumber: 2,
      tradeName: 'PRODUTO FICTÍCIO FARMACÊUTICO',
      currentRegistrationNumber: 'BR-FICTICIO-F-001',
      previousRegistrationNumber: 'BR-ANTERIOR-F-001',
      marketingStatus: 'registered',
      authorizedSpecies: ['BOVINO', 'CANINO'],
      routes: ['ORAL'],
    })
    expect(result.dataset.candidates[0].components).toEqual([
      {
        sourceName: 'ATIVO FICTÍCIO A',
        sourceKind: 'pharmaceuticalActive',
        ingredientId: null,
        linkStatus: 'unmatched',
      },
      {
        sourceName: 'ATIVO FICTÍCIO B',
        sourceKind: 'pharmaceuticalActive',
        ingredientId: null,
        linkStatus: 'unmatched',
      },
    ])
  })

  it('accounts for candidates, exclusions, conflicts, and review queues', () => {
    const result = adaptMapaPharmaceuticalExport(
      qualityFixtureBytes(),
      'quality-fixture.csv',
      '2026-07-16',
    )

    expect(result.report.summary).toEqual({
      sourceRows: 8,
      candidateRows: 7,
      excludedRows: 1,
      registeredRows: 4,
      suspendedRows: 1,
      cancelledRows: 1,
      unknownStatusRows: 1,
      rowsWithoutCurrentRegistration: 1,
      rowsWithoutAnyIngredient: 1,
      duplicateRegistrationGroups: 1,
      unmatchedComponentValues: 6,
    })
    expect(result.report.reviewQueues.legacyRegistrations).toEqual([
      {
        sourceRowNumber: 3,
        tradeName: 'PRODUTO FICTÍCIO LEGADO',
        previousRegistrationNumber: 'BR-ANTERIOR-002',
        sourceStatus: 'Ativo',
      },
    ])
    expect(result.report.reviewQueues.duplicateRegistrations).toEqual([
      {
        currentRegistrationNumber: 'BR-DUP',
        sourceRowNumbers: [4, 5],
        conflictingFields: ['activeIngredientText', 'authorizedSpecies'],
      },
    ])
    expect(result.report.reviewQueues.missingIngredients).toEqual([
      {
        sourceRowNumber: 6,
        tradeName: 'PRODUTO FICTÍCIO SEM INSUMO',
        currentRegistrationNumber: 'BR-005',
      },
    ])
    expect(result.report.reviewQueues.unknownStatuses).toEqual([
      {
        sourceRowNumber: 8,
        tradeName: 'PRODUTO FICTÍCIO STATUS NOVO',
        sourceStatus: 'Em análise',
      },
    ])
    expect(result.report.exclusions).toEqual([
      {
        sourceRowNumber: 9,
        reasons: ['missingTradeName'],
      },
    ])

    const activeA = result.report.reviewQueues.unmatchedComponents.find(
      (component) => component.sourceName === 'ATIVO A',
    )
    expect(activeA).toEqual({
      sourceName: 'ATIVO A',
      sourceKind: 'pharmaceuticalActive',
      occurrenceCount: 2,
      sourceRowNumbers: [2, 8],
    })
  })

  it('does not copy ignored clinical field values into intermediate artifacts', () => {
    const serializedResult = JSON.stringify(
      adaptMapaPharmaceuticalExport(
        qualityFixtureBytes(),
        'quality-fixture.csv',
        '2026-07-16',
      ),
    )

    expect(serializedResult).not.toContain('LINHA FICTÍCIA')
    expect(serializedResult).not.toContain('ADVERTÊNCIA FICTÍCIA')
    expect(serializedResult).not.toContain('INDICAÇÃO FICTÍCIA')
  })

  it('fails closed for an unexpected header or retrieval date', () => {
    const validBytes = qualityFixtureBytes()
    const unexpectedHeaderBytes = new TextEncoder().encode(
      new TextDecoder().decode(validBytes).replace(
        '"Nome do Produto"',
        '"Produto"',
      ),
    )

    expect(() =>
      adaptMapaPharmaceuticalExport(
        unexpectedHeaderBytes,
        'unexpected.csv',
        '2026-07-16',
      ),
    ).toThrow(MapaPharmaceuticalAdapterError)
    expect(() =>
      adaptMapaPharmaceuticalExport(
        validBytes,
        'valid.csv',
        '16/07/2026',
      ),
    ).toThrow('retrievedAt must use the YYYY-MM-DD format.')
    expect(() =>
      adaptMapaPharmaceuticalExport(
        validBytes,
        'valid.csv',
        '2026-02-30',
      ),
    ).toThrow('retrievedAt must use the YYYY-MM-DD format.')
  })

  it('produces byte-identical serializations for identical inputs', () => {
    const bytes = qualityFixtureBytes()
    const firstResult = adaptMapaPharmaceuticalExport(
      bytes,
      'quality-fixture.csv',
      '2026-07-16',
    )
    const secondResult = adaptMapaPharmaceuticalExport(
      bytes,
      'quality-fixture.csv',
      '2026-07-16',
    )

    expect(JSON.stringify(firstResult)).toBe(JSON.stringify(secondResult))
  })
})
