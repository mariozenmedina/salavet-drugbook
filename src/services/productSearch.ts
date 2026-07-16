import type {
  ProductSearchIndexFile,
  ProductSearchIndexItem,
} from '../types/drugbook'
import { normalizeSearchText } from './drugSearch'

export interface ProductSearchOptions {
  limit?: number
  locale?: string
}

interface RankedProductSearchItem {
  item: ProductSearchIndexItem
  score: number
}

function searchableFields(
  item: ProductSearchIndexItem,
  locale: string,
): string[] {
  return [
    item.tradeName,
    item.registrationNumber,
    item.previousRegistrationNumber,
    item.holder,
    ...item.componentNames,
    ...item.pharmaceuticalClasses,
    ...item.species,
  ]
    .filter((value): value is string => value !== null)
    .map((value) => normalizeSearchText(value, locale))
    .filter(
      (value, index, values) =>
        value.length > 0 && values.indexOf(value) === index,
    )
}

function rankProduct(
  item: ProductSearchIndexItem,
  normalizedQuery: string,
  locale: string,
): RankedProductSearchItem | null {
  const fields = searchableFields(item, locale)
  const normalizedTradeName = normalizeSearchText(item.tradeName, locale)
  const combinedFields = fields.join(' ')
  const queryTokens = normalizedQuery.split(' ')

  if (!queryTokens.every((token) => combinedFields.includes(token))) {
    return null
  }

  let score = 60

  if (normalizedTradeName === normalizedQuery) {
    score = 0
  } else if (normalizedTradeName.startsWith(normalizedQuery)) {
    score = 10
  } else if (normalizedTradeName.includes(normalizedQuery)) {
    score = 20
  } else if (fields.some((field) => field === normalizedQuery)) {
    score = 30
  } else if (fields.some((field) => field.startsWith(normalizedQuery))) {
    score = 40
  } else if (fields.some((field) => field.includes(normalizedQuery))) {
    score = 50
  }

  return { item, score }
}

export function searchProductIndex(
  index: ProductSearchIndexFile,
  query: string,
  options: ProductSearchOptions = {},
): ProductSearchIndexItem[] {
  const locale = options.locale ?? index.locale
  const normalizedQuery = normalizeSearchText(query, locale)

  if (!normalizedQuery) {
    return []
  }

  const limit = Math.max(0, Math.floor(options.limit ?? 20))

  return index.items
    .map((item) => rankProduct(item, normalizedQuery, locale))
    .filter((candidate): candidate is RankedProductSearchItem => candidate !== null)
    .sort(
      (left, right) =>
        left.score - right.score
        || left.item.normalizedTradeName.localeCompare(
          right.item.normalizedTradeName,
          locale,
        )
        || left.item.productId.localeCompare(right.item.productId, 'en'),
    )
    .slice(0, limit)
    .map((candidate) => candidate.item)
}
