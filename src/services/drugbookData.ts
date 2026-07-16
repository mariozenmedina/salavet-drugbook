import type {
  AlphabetFile,
  CommercialProduct,
  ConceptShard,
  DrugMonograph,
  LetterFile,
  LocaleList,
  LocaleManifest,
  ProductCatalogManifest,
  ProductSearchIndexFile,
  ProductShard,
  SearchIndexFile,
  UiText,
} from '../types/drugbook'
import {
  formatValidationIssues,
  validateAlphabetFile,
  validateConceptShard,
  validateDrugMonograph,
  validateLetterFile,
  validateLocaleList,
  validateLocaleManifest,
  validateProductCatalogManifest,
  validateProductSearchIndex,
  validateProductShard,
  validateSearchIndex,
  validateUiText,
  type DataValidator,
  type ValidationIssue,
} from './dataValidation'

export interface JsonResponse {
  ok: boolean
  status: number
  statusText: string
  json(): Promise<unknown>
}

export type JsonFetcher = (path: string) => Promise<JsonResponse>

const defaultFetcher: JsonFetcher = (path) => fetch(path)

export class DrugbookDataError extends Error {
  readonly path: string

  constructor(message: string, path: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DrugbookDataError'
    this.path = path
  }
}

export class DrugbookHttpError extends DrugbookDataError {
  readonly status: number

  constructor(path: string, status: number, statusText: string) {
    super(`Unable to load drugbook data from ${path}: ${status} ${statusText}`.trim(), path)
    this.name = 'DrugbookHttpError'
    this.status = status
  }
}

export class DrugbookValidationError extends DrugbookDataError {
  readonly issues: ValidationIssue[]

  constructor(path: string, issues: ValidationIssue[]) {
    super(`Invalid drugbook data from ${path}\n${formatValidationIssues(issues)}`, path)
    this.name = 'DrugbookValidationError'
    this.issues = issues
  }
}

export class ProductNotFoundError extends DrugbookDataError {
  readonly productId: string

  constructor(productId: string) {
    super(`Product ${productId} was not found in the catalog`, productId)
    this.name = 'ProductNotFoundError'
    this.productId = productId
  }
}

function safeSegment(value: string, label: string): string {
  if (!/^[a-z0-9-]+$/i.test(value)) {
    throw new DrugbookDataError(`Invalid ${label} data path segment: ${value}`, value)
  }

  return value
}

export async function loadValidatedJson<T>(
  path: string,
  validator: DataValidator<T>,
  fetcher: JsonFetcher = defaultFetcher,
): Promise<T> {
  const response = await fetcher(path)

  if (!response.ok) {
    throw new DrugbookHttpError(path, response.status, response.statusText)
  }

  let candidate: unknown

  try {
    candidate = await response.json()
  } catch (cause) {
    throw new DrugbookDataError(`Unable to parse drugbook JSON from ${path}`, path, { cause })
  }

  const result = validator(candidate)

  if (!result.ok) {
    throw new DrugbookValidationError(path, result.issues)
  }

  return result.value
}

export function loadLocales(fetcher?: JsonFetcher): Promise<LocaleList> {
  return loadValidatedJson('/data/locales.json', validateLocaleList, fetcher)
}

export function loadLocaleManifest(locale: string, fetcher?: JsonFetcher): Promise<LocaleManifest> {
  const localeSegment = safeSegment(locale, 'locale')
  return loadValidatedJson(`/data/${localeSegment}/manifest.json`, validateLocaleManifest, fetcher)
}

export function loadUiText(locale: string, fetcher?: JsonFetcher): Promise<UiText> {
  const localeSegment = safeSegment(locale, 'locale')
  return loadValidatedJson(`/data/${localeSegment}/ui.json`, validateUiText, fetcher)
}

export function loadAlphabet(locale: string, fetcher?: JsonFetcher): Promise<AlphabetFile> {
  const localeSegment = safeSegment(locale, 'locale')
  return loadValidatedJson(`/data/${localeSegment}/alphabet.json`, validateAlphabetFile, fetcher)
}

export function loadSearchIndex(locale: string, fetcher?: JsonFetcher): Promise<SearchIndexFile> {
  const localeSegment = safeSegment(locale, 'locale')
  return loadValidatedJson(`/data/${localeSegment}/search-index.json`, validateSearchIndex, fetcher)
}

export function loadProductCatalogManifest(
  locale: string,
  fetcher?: JsonFetcher,
): Promise<ProductCatalogManifest> {
  const localeSegment = safeSegment(locale, 'locale')
  return loadValidatedJson(
    `/data/${localeSegment}/catalog/products/manifest.json`,
    validateProductCatalogManifest,
    fetcher,
  )
}

export function loadProductSearchIndex(
  locale: string,
  fetcher?: JsonFetcher,
): Promise<ProductSearchIndexFile> {
  const localeSegment = safeSegment(locale, 'locale')
  return loadValidatedJson(
    `/data/${localeSegment}/product-search-index.json`,
    validateProductSearchIndex,
    fetcher,
  )
}

export function loadLetter(locale: string, letter: string, fetcher?: JsonFetcher): Promise<LetterFile> {
  const localeSegment = safeSegment(locale, 'locale')
  const letterSegment = safeSegment(letter.toLocaleLowerCase('en'), 'letter')
  return loadValidatedJson(`/data/${localeSegment}/letters/${letterSegment}.json`, validateLetterFile, fetcher)
}

export function loadConceptShard(
  locale: string,
  letter: string,
  fetcher?: JsonFetcher,
): Promise<ConceptShard> {
  const localeSegment = safeSegment(locale, 'locale')
  const letterSegment = safeSegment(letter.toLocaleLowerCase('en'), 'letter')
  return loadValidatedJson(
    `/data/${localeSegment}/catalog/concepts/${letterSegment}.json`,
    validateConceptShard,
    fetcher,
  )
}

export function loadProductShard(
  locale: string,
  letter: string,
  fetcher?: JsonFetcher,
): Promise<ProductShard> {
  const localeSegment = safeSegment(locale, 'locale')
  const letterSegment = safeSegment(letter.toLocaleLowerCase('en'), 'letter')
  return loadValidatedJson(
    `/data/${localeSegment}/catalog/products/${letterSegment}.json`,
    validateProductShard,
    fetcher,
  )
}

export async function loadCommercialProduct(
  locale: string,
  productId: string,
  fetcher?: JsonFetcher,
): Promise<CommercialProduct> {
  const safeProductId = safeSegment(productId, 'product')
  const index = await loadProductSearchIndex(locale, fetcher)
  const indexItem = index.items.find((item) => item.productId === safeProductId)

  if (!indexItem) {
    throw new ProductNotFoundError(safeProductId)
  }

  const shard = await loadProductShard(locale, indexItem.shard, fetcher)
  const product = shard.items.find((item) => item.id === safeProductId)

  if (!product) {
    throw new DrugbookDataError(
      `Product index entry ${safeProductId} is missing from shard ${indexItem.shard}`,
      indexItem.path,
    )
  }

  return product
}

export function loadMonograph(
  locale: string,
  slug: string,
  fetcher?: JsonFetcher,
): Promise<DrugMonograph> {
  const localeSegment = safeSegment(locale, 'locale')
  const slugSegment = safeSegment(slug, 'monograph')
  return loadValidatedJson(
    `/data/${localeSegment}/monographs/${slugSegment}.json`,
    validateDrugMonograph,
    fetcher,
  )
}
