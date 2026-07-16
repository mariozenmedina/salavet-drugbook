import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { auditVeterinaryProductSource } from './veterinarySourceAudit.ts'

function fixtureBytes(fileName: string): Buffer {
  return readFileSync(resolve('tests', 'fixtures', 'sources', fileName))
}

describe('auditVeterinaryProductSource', () => {
  it('classifies the observed SIPEAGRO schema as an establishment catalog', () => {
    const bytes = fixtureBytes('sipeagro-establishments.csv')
    const report = auditVeterinaryProductSource(
      bytes,
      'sipeagro-establishments.csv',
    )

    expect(report.format.rowCount).toBe(2)
    expect(report.classification).toMatchObject({
      schema: 'sipeagro-establishment-catalog',
      canProceedToProductMapping: false,
      recognizedFields: {
        activeIngredients: null,
        registrationNumber: null,
        tradeName: null,
      },
    })
    expect(report.classification.blockingReasons).toEqual([
      'The file matches the SIPEAGRO establishment schema and contains no product-level records.',
    ])
    expect(report.source.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  })

  it('recognizes a candidate product file without accepting component mappings', () => {
    const report = auditVeterinaryProductSource(
      fixtureBytes('mapa-product-candidate.csv'),
      'mapa-product-candidate.csv',
    )

    expect(report.classification).toEqual({
      schema: 'product-catalog-candidate',
      canProceedToProductMapping: true,
      recognizedFields: {
        activeIngredients: 'PRINCÍPIOS ATIVOS',
        registrationNumber: 'NÚMERO DO REGISTRO',
        tradeName: 'NOME COMERCIAL',
      },
      blockingReasons: [],
    })
  })

  it.each([
    {
      fileName: 'mapa-pharmaceutical-export.csv',
      recognizedFields: {
        activeIngredients: 'IFA´s',
        registrationNumber: 'Registro do Produto',
        tradeName: 'Nome do Produto',
      },
    },
    {
      fileName: 'mapa-biological-export.csv',
      recognizedFields: {
        activeIngredients: 'Insumos ativos',
        registrationNumber: 'Nº Licença',
        tradeName: 'Denominação do Produto',
      },
    },
  ])('recognizes the official MAPA headers in $fileName', ({ fileName, recognizedFields }) => {
    const report = auditVeterinaryProductSource(fixtureBytes(fileName), fileName)

    expect(report.format.delimiter).toBe(',')
    expect(report.classification).toEqual({
      schema: 'product-catalog-candidate',
      canProceedToProductMapping: true,
      recognizedFields,
      blockingReasons: [],
    })
  })

  it('fails closed when a product-identifying field is missing', () => {
    const report = auditVeterinaryProductSource(
      new TextEncoder().encode('NOME COMERCIAL;NÚMERO DO REGISTRO\nProduto teste;BR-1\n'),
      'incomplete.csv',
    )

    expect(report.classification.schema).toBe('unknown')
    expect(report.classification.canProceedToProductMapping).toBe(false)
    expect(report.classification.blockingReasons).toEqual([
      'Missing a recognized active-ingredient or composition column.',
    ])
  })

  it('produces identical reports for identical bytes and file names', () => {
    const bytes = fixtureBytes('mapa-product-candidate.csv')

    expect(auditVeterinaryProductSource(bytes, 'fixture.csv')).toEqual(
      auditVeterinaryProductSource(bytes, 'fixture.csv'),
    )
  })
})
