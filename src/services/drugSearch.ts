import type { SearchIndexFile, SearchIndexItem } from '../types/drugbook'

export interface DrugSearchOptions {
  limit?: number
  locale?: string
}

interface RankedSearchItem {
  item: SearchIndexItem
  normalizedPrimaryName: string
  score: number
}

export function normalizeSearchText(value: string, locale = 'pt-BR'): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase(locale)
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function searchableFields(item: SearchIndexItem, locale: string): string[] {
  return [item.primaryName, ...item.synonyms, ...item.tradeNames, ...item.componentNames]
    .map((value) => normalizeSearchText(value, locale))
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
}

function rankItem(item: SearchIndexItem, normalizedQuery: string, locale: string): RankedSearchItem | null {
  const fields = searchableFields(item, locale)
  const normalizedPrimaryName = normalizeSearchText(item.primaryName, locale)
  const combinedFields = fields.join(' ')
  const queryTokens = normalizedQuery.split(' ')

  if (!queryTokens.every((token) => combinedFields.includes(token))) {
    return null
  }

  let score = 60

  if (normalizedPrimaryName === normalizedQuery) {
    score = 0
  } else if (normalizedPrimaryName.startsWith(normalizedQuery)) {
    score = 10
  } else if (normalizedPrimaryName.includes(normalizedQuery)) {
    score = 20
  } else if (fields.some((field) => field === normalizedQuery)) {
    score = 30
  } else if (fields.some((field) => field.startsWith(normalizedQuery))) {
    score = 40
  } else if (fields.some((field) => field.includes(normalizedQuery))) {
    score = 50
  }

  return {
    item,
    normalizedPrimaryName,
    score,
  }
}

export function searchDrugIndex(
  index: SearchIndexFile,
  query: string,
  options: DrugSearchOptions = {},
): SearchIndexItem[] {
  const locale = options.locale ?? index.locale
  const normalizedQuery = normalizeSearchText(query, locale)

  if (!normalizedQuery) {
    return []
  }

  const limit = Math.max(0, Math.floor(options.limit ?? 20))

  return index.items
    .map((item) => rankItem(item, normalizedQuery, locale))
    .filter((candidate): candidate is RankedSearchItem => candidate !== null)
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.normalizedPrimaryName.localeCompare(right.normalizedPrimaryName, locale) ||
        left.item.conceptId.localeCompare(right.item.conceptId, 'en'),
    )
    .slice(0, limit)
    .map((candidate) => candidate.item)
}
