import { describe, expect, it, vi } from 'vitest'
import localesJson from '../../public/data/locales.json'
import alphabetJson from '../../public/data/pt-BR/alphabet.json'
import conceptsJson from '../../public/data/pt-BR/catalog/concepts/a.json'
import productManifestJson from '../../public/data/pt-BR/catalog/products/manifest.json'
import productsJson from '../../public/data/pt-BR/catalog/products/a.json'
import letterJson from '../../public/data/pt-BR/letters/a.json'
import manifestJson from '../../public/data/pt-BR/manifest.json'
import monographJson from '../../public/data/pt-BR/monographs/carprofeno.json'
import productSearchIndexJson from '../../public/data/pt-BR/product-search-index.json'
import searchIndexJson from '../../public/data/pt-BR/search-index.json'
import uiJson from '../../public/data/pt-BR/ui.json'
import {
  DrugbookDataError,
  DrugbookHttpError,
  DrugbookValidationError,
  loadAlphabet,
  loadConceptShard,
  loadLetter,
  loadLocaleManifest,
  loadLocales,
  loadMonograph,
  loadProductCatalogManifest,
  loadProductSearchIndex,
  loadProductShard,
  loadSearchIndex,
  loadUiText,
  type JsonFetcher,
} from './drugbookData'

const fixtureByPath: Record<string, unknown> = {
  '/data/locales.json': localesJson,
  '/data/pt-BR/manifest.json': manifestJson,
  '/data/pt-BR/ui.json': uiJson,
  '/data/pt-BR/alphabet.json': alphabetJson,
  '/data/pt-BR/search-index.json': searchIndexJson,
  '/data/pt-BR/letters/a.json': letterJson,
  '/data/pt-BR/catalog/concepts/a.json': conceptsJson,
  '/data/pt-BR/catalog/products/manifest.json': productManifestJson,
  '/data/pt-BR/catalog/products/a.json': productsJson,
  '/data/pt-BR/product-search-index.json': productSearchIndexJson,
  '/data/pt-BR/monographs/carprofeno.json': monographJson,
}

function fixtureFetcher(): JsonFetcher {
  return vi.fn(async (path: string) => {
    const body = fixtureByPath[path]

    return {
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      statusText: body === undefined ? 'Not Found' : 'OK',
      json: async () => body,
    }
  })
}

describe('drugbook JSON loaders', () => {
  it('loads and validates every supported fixture type', async () => {
    const fetcher = fixtureFetcher()

    const [
      locales,
      manifest,
      ui,
      alphabet,
      search,
      productManifest,
      productSearch,
      letter,
      concepts,
      products,
      monograph,
    ] =
      await Promise.all([
        loadLocales(fetcher),
        loadLocaleManifest('pt-BR', fetcher),
        loadUiText('pt-BR', fetcher),
        loadAlphabet('pt-BR', fetcher),
        loadSearchIndex('pt-BR', fetcher),
        loadProductCatalogManifest('pt-BR', fetcher),
        loadProductSearchIndex('pt-BR', fetcher),
        loadLetter('pt-BR', 'A', fetcher),
        loadConceptShard('pt-BR', 'A', fetcher),
        loadProductShard('pt-BR', 'A', fetcher),
        loadMonograph('pt-BR', 'carprofeno', fetcher),
      ])

    expect(locales.defaultLocale).toBe('pt-BR')
    expect(manifest.schemaVersion).toBe('1.0.0')
    expect(ui.welcome.title).toBe('Drugbook veterinário')
    expect(alphabet.letters).toHaveLength(2)
    expect(search.items).toHaveLength(4)
    expect(productManifest.totalCount).toBe(2_825)
    expect(productSearch.items).toHaveLength(2_825)
    expect(letter.letter).toBe('a')
    expect(concepts.items).toHaveLength(2)
    expect(products.items).toHaveLength(242)
    expect(monograph.monographStatus).toBe('needsReview')
  })

  it('throws a typed HTTP error for missing files', async () => {
    const fetcher = fixtureFetcher()

    await expect(loadLetter('pt-BR', 'z', fetcher)).rejects.toEqual(
      expect.objectContaining<Partial<DrugbookHttpError>>({
        name: 'DrugbookHttpError',
        path: '/data/pt-BR/letters/z.json',
        status: 404,
      }),
    )
  })

  it('throws a path-aware validation error for malformed JSON', async () => {
    const fetcher: JsonFetcher = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ locale: 'pt-BR', items: [{ conceptId: 42 }] }),
    })

    await expect(loadSearchIndex('pt-BR', fetcher)).rejects.toEqual(
      expect.objectContaining<Partial<DrugbookValidationError>>({
        name: 'DrugbookValidationError',
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: '$.items[0].conceptId',
          }),
        ]),
      }),
    )
  })

  it('rejects unsafe path segments before fetching', () => {
    const fetcher = fixtureFetcher()

    expect(() => loadMonograph('pt-BR', '../secrets', fetcher)).toThrow(DrugbookDataError)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
