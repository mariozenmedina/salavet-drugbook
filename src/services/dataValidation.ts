import type {
  AlertSeverity,
  AlphabetFile,
  CalculatorStatus,
  CatalogStatus,
  ClinicalReviewStatus,
  ComponentLinkStatus,
  ConceptShard,
  DrugConcept,
  DrugConceptType,
  DrugMonograph,
  DrugbookDatasetRelations,
  LetterFile,
  LocaleList,
  LocaleManifest,
  MarketingStatus,
  MonographStatus,
  ProductCatalogManifest,
  ProductSearchIndexFile,
  ProductShard,
  ReferenceKind,
  RegulatoryUseType,
  RenderableSection,
  SearchIndexFile,
  SourceRegistry,
  TextDirection,
  UiText,
} from '../types/drugbook'

export interface ValidationIssue {
  path: string
  message: string
}

export type ValidationResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      issues: ValidationIssue[]
    }

export type DataValidator<T> = (value: unknown) => ValidationResult<T>

type JsonRecord = Record<string, unknown>

const textDirections: readonly TextDirection[] = ['ltr', 'rtl']
const conceptTypes: readonly DrugConceptType[] = ['ingredient', 'combination']
const catalogStatuses: readonly CatalogStatus[] = ['imported', 'normalized', 'verified', 'retired']
const componentLinkStatuses: readonly ComponentLinkStatus[] = ['unmatched', 'candidate', 'verified']
const monographStatuses: readonly MonographStatus[] = ['draft', 'needsReview', 'reviewed']
const clinicalReviewStatuses: readonly ClinicalReviewStatus[] = ['draft', 'needsReview', 'reviewed']
const calculatorStatuses: readonly CalculatorStatus[] = ['notEvaluated', 'needsReview', 'calculatorReady']
const marketingStatuses: readonly MarketingStatus[] = ['registered', 'suspended', 'cancelled', 'unknown']
const regulatoryUseTypes: readonly RegulatoryUseType[] = ['onLabel', 'offLabel', 'unknown']
const alertSeverities: readonly AlertSeverity[] = ['info', 'caution', 'warning', 'danger']
const referenceKinds: readonly ReferenceKind[] = [
  'book',
  'database',
  'guideline',
  'journalArticle',
  'regulatoryDataset',
  'regulatoryLabel',
  'website',
]
const sectionKinds = ['paragraphs', 'list', 'table', 'doseSummary', 'alerts', 'references'] as const
const uiProductSectionKeys = [
  'regulatory',
  'composition',
  'presentation',
  'authorization',
  'source',
] as const
const uiProductFieldKeys = [
  'marketingStatus',
  'registrationNumber',
  'previousRegistrationNumber',
  'regulatoryAuthority',
  'jurisdiction',
  'components',
  'dosageForms',
  'pharmaceuticalClasses',
  'routes',
  'authorizedSpecies',
  'holder',
  'holderRegistrationNumber',
  'origin',
  'sourceId',
  'sourceRecordId',
  'retrievedAt',
  'contentHash',
] as const

function addIssue(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({ path, message })
}

function asRecord(value: unknown, path: string, issues: ValidationIssue[]): JsonRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    addIssue(issues, path, 'Expected an object')
    return null
  }

  return value as JsonRecord
}

function asArray(value: unknown, path: string, issues: ValidationIssue[]): unknown[] | null {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Expected an array')
    return null
  }

  return value
}

function requireString(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string | null {
  const value = record[key]
  const fieldPath = `${path}.${key}`

  if (typeof value !== 'string') {
    addIssue(issues, fieldPath, 'Expected a string')
    return null
  }

  if (value.trim().length === 0) {
    addIssue(issues, fieldPath, 'Expected a non-empty string')
  }

  return value
}

function requireNullableString(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string | null | undefined {
  const value = record[key]
  const fieldPath = `${path}.${key}`

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    addIssue(issues, fieldPath, 'Expected a string or null')
    return undefined
  }

  if (value.trim().length === 0) {
    addIssue(issues, fieldPath, 'Expected a non-empty string or null')
  }

  return value
}

function requireNumber(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): number | null {
  const value = record[key]
  const fieldPath = `${path}.${key}`

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addIssue(issues, fieldPath, 'Expected a finite number')
    return null
  }

  return value
}

function requireNullableNumber(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): number | null | undefined {
  const value = record[key]
  const fieldPath = `${path}.${key}`

  if (value === null) {
    return null
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addIssue(issues, fieldPath, 'Expected a finite number or null')
    return undefined
  }

  return value
}

function requireInteger(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
  minimum = Number.MIN_SAFE_INTEGER,
): number | null {
  const value = requireNumber(record, key, path, issues)

  if (value !== null && (!Number.isInteger(value) || value < minimum)) {
    addIssue(issues, `${path}.${key}`, `Expected an integer greater than or equal to ${minimum}`)
  }

  return value
}

function requireEnum<T extends string>(
  record: JsonRecord,
  key: string,
  allowed: readonly T[],
  path: string,
  issues: ValidationIssue[],
): T | null {
  const value = requireString(record, key, path, issues)

  if (value !== null && !allowed.includes(value as T)) {
    addIssue(issues, `${path}.${key}`, `Expected one of: ${allowed.join(', ')}`)
    return null
  }

  return value as T | null
}

function requireStringArray(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string[] | null {
  const fieldPath = `${path}.${key}`
  const values = asArray(record[key], fieldPath, issues)

  if (!values) {
    return null
  }

  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      addIssue(issues, `${fieldPath}[${index}]`, 'Expected a non-empty string')
    }
  })

  return values as string[]
}

function validateObjectArray(
  record: JsonRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
  validateItem: (value: unknown, itemPath: string, itemIssues: ValidationIssue[]) => void,
): void {
  const fieldPath = `${path}.${key}`
  const values = asArray(record[key], fieldPath, issues)

  values?.forEach((value, index) => validateItem(value, `${fieldPath}[${index}]`, issues))
}

function validateExternalIdentifier(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'system', path, issues)
  requireString(record, 'value', path, issues)
}

function validateLocaleDefinition(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'code', path, issues)
  requireString(record, 'label', path, issues)
  requireString(record, 'nativeLabel', path, issues)
}

function validateManifestLetter(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireString(record, 'label', path, issues)
  requireString(record, 'path', path, issues)
  requireInteger(record, 'count', path, issues, 0)
}

function validateAlphabetLetter(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireString(record, 'label', path, issues)
  requireString(record, 'sortKey', path, issues)
}

function validateDrugConcept(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  const conceptType = requireEnum(record, 'conceptType', conceptTypes, path, issues)
  requireString(record, 'primaryName', path, issues)
  requireString(record, 'normalizedName', path, issues)
  requireStringArray(record, 'synonyms', path, issues)
  validateObjectArray(record, 'externalIdentifiers', path, issues, validateExternalIdentifier)
  requireEnum(record, 'catalogStatus', catalogStatuses, path, issues)
  requireStringArray(record, 'referenceIds', path, issues)

  if (conceptType === 'combination') {
    const ingredientIds = requireStringArray(record, 'ingredientIds', path, issues)

    if (ingredientIds && ingredientIds.length < 2) {
      addIssue(issues, `${path}.ingredientIds`, 'Expected at least two ingredient IDs')
    }
  }
}

function validateProductStrength(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireNumber(record, 'value', path, issues)
  requireString(record, 'unit', path, issues)
  const perValue = requireNullableNumber(record, 'perValue', path, issues)
  const perUnit = requireNullableString(record, 'perUnit', path, issues)

  if ((perValue === null) !== (perUnit === null)) {
    addIssue(issues, path, 'perValue and perUnit must both be null or both have values')
  }
}

function validateProductComponent(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireNullableString(record, 'ingredientId', path, issues)
  requireString(record, 'sourceIngredientName', path, issues)
  requireEnum(record, 'role', ['active'] as const, path, issues)

  if (record.strength !== null) {
    validateProductStrength(record.strength, `${path}.strength`, issues)
  }
}

function validateSourceRecord(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'sourceId', path, issues)
  requireString(record, 'recordId', path, issues)
  requireString(record, 'retrievedAt', path, issues)
  requireString(record, 'contentHash', path, issues)
}

function validateCommercialProduct(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireString(record, 'tradeName', path, issues)
  requireString(record, 'jurisdiction', path, issues)
  requireString(record, 'regulatoryAuthority', path, issues)
  requireNullableString(record, 'registrationNumber', path, issues)
  requireNullableString(record, 'previousRegistrationNumber', path, issues)
  requireEnum(record, 'marketingStatus', marketingStatuses, path, issues)
  requireNullableString(record, 'holderRegistrationNumber', path, issues)
  requireNullableString(record, 'holder', path, issues)
  requireNullableString(record, 'conceptId', path, issues)
  validateObjectArray(record, 'components', path, issues, validateProductComponent)
  requireEnum(record, 'componentLinkStatus', componentLinkStatuses, path, issues)
  requireStringArray(record, 'dosageForms', path, issues)
  requireStringArray(record, 'pharmaceuticalClasses', path, issues)
  requireStringArray(record, 'routes', path, issues)
  requireStringArray(record, 'authorizedSpecies', path, issues)
  requireNullableString(record, 'origin', path, issues)
  validateSourceRecord(record.sourceRecord, `${path}.sourceRecord`, issues)
}

function validateProductCatalogManifestShard(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireString(record, 'label', path, issues)
  requireString(record, 'path', path, issues)
  requireNumber(record, 'count', path, issues)
}

function validateProductSearchIndexItem(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'productId', path, issues)
  requireString(record, 'tradeName', path, issues)
  requireString(record, 'normalizedTradeName', path, issues)
  requireNullableString(record, 'registrationNumber', path, issues)
  requireNullableString(record, 'previousRegistrationNumber', path, issues)
  requireEnum(record, 'marketingStatus', marketingStatuses, path, issues)
  requireNullableString(record, 'holder', path, issues)
  requireStringArray(record, 'componentNames', path, issues)
  requireStringArray(record, 'pharmaceuticalClasses', path, issues)
  requireStringArray(record, 'species', path, issues)
  requireString(record, 'shard', path, issues)
  requireString(record, 'path', path, issues)
}

function validateLetterItem(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'conceptId', path, issues)
  requireString(record, 'slug', path, issues)
  requireString(record, 'primaryName', path, issues)
  requireEnum(record, 'conceptType', conceptTypes, path, issues)
  requireStringArray(record, 'tradeNames', path, issues)
  requireStringArray(record, 'synonyms', path, issues)
  requireStringArray(record, 'species', path, issues)
  requireEnum(record, 'monographStatus', monographStatuses, path, issues)
  requireString(record, 'path', path, issues)
}

function validateSearchIndexItem(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  validateLetterItem(value, path, issues)
  requireString(record, 'letter', path, issues)
  requireStringArray(record, 'componentNames', path, issues)
}

function validateReferencedText(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'text', path, issues)
  requireStringArray(record, 'referenceIds', path, issues)
}

function validateRenderableSection(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireString(record, 'title', path, issues)
  const kind = requireEnum(record, 'kind', sectionKinds, path, issues)

  switch (kind) {
    case 'paragraphs':
      validateObjectArray(record, 'paragraphs', path, issues, validateReferencedText)
      break
    case 'list':
      validateObjectArray(record, 'items', path, issues, validateReferencedText)
      break
    case 'table': {
      requireStringArray(record, 'headers', path, issues)
      const rows = asArray(record.rows, `${path}.rows`, issues)
      rows?.forEach((row, rowIndex) => {
        const cells = asArray(row, `${path}.rows[${rowIndex}]`, issues)
        cells?.forEach((cell, cellIndex) =>
          validateReferencedText(cell, `${path}.rows[${rowIndex}][${cellIndex}]`, issues),
        )
      })
      break
    }
    case 'doseSummary':
      requireStringArray(record, 'dosageIds', path, issues)
      break
    case 'alerts':
      requireStringArray(record, 'alertIds', path, issues)
      break
    case 'references':
      requireStringArray(record, 'referenceIds', path, issues)
      break
  }
}

function validateDoseRange(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  const minimum = requireNumber(record, 'min', path, issues)
  const maximum = requireNumber(record, 'max', path, issues)
  requireString(record, 'unit', path, issues)

  if (minimum !== null && maximum !== null && minimum > maximum) {
    addIssue(issues, path, 'Dose minimum cannot be greater than dose maximum')
  }
}

function validateMaximumDose(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireNumber(record, 'value', path, issues)
  requireString(record, 'unit', path, issues)
}

function validateDosage(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireEnum(record, 'reviewStatus', clinicalReviewStatuses, path, issues)
  requireEnum(record, 'calculatorStatus', calculatorStatuses, path, issues)
  requireString(record, 'species', path, issues)
  requireString(record, 'indication', path, issues)
  requireString(record, 'route', path, issues)
  validateDoseRange(record.dose, `${path}.dose`, issues)
  requireString(record, 'frequency', path, issues)
  requireNullableString(record, 'duration', path, issues)

  if (record.maxDose !== null) {
    validateMaximumDose(record.maxDose, `${path}.maxDose`, issues)
  }

  requireStringArray(record, 'requiredPatientFields', path, issues)
  validateObjectArray(record, 'notes', path, issues, validateReferencedText)
  requireStringArray(record, 'referenceIds', path, issues)
}

function validateRegulatoryContext(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'jurisdiction', path, issues)
  requireEnum(record, 'useType', regulatoryUseTypes, path, issues)
}

function validateSpeciesEvidence(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireString(record, 'species', path, issues)
  requireString(record, 'indication', path, issues)
  validateRegulatoryContext(record.regulatoryContext, `${path}.regulatoryContext`, issues)
  requireEnum(record, 'reviewStatus', clinicalReviewStatuses, path, issues)
  validateObjectArray(record, 'sections', path, issues, validateRenderableSection)
  validateObjectArray(record, 'dosages', path, issues, validateDosage)
  requireStringArray(record, 'referenceIds', path, issues)
}

function validateAlertApplicability(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireStringArray(record, 'species', path, issues)
}

function validateClinicalAlert(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireEnum(record, 'severity', alertSeverities, path, issues)
  validateAlertApplicability(record.appliesTo, `${path}.appliesTo`, issues)
  requireString(record, 'message', path, issues)
  requireString(record, 'recommendation', path, issues)
  requireStringArray(record, 'referenceIds', path, issues)
}

function validateSafetyInformation(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  validateObjectArray(record, 'contraindications', path, issues, validateClinicalAlert)
  validateObjectArray(record, 'warnings', path, issues, validateClinicalAlert)
  validateObjectArray(record, 'adverseEffects', path, issues, validateClinicalAlert)
  validateObjectArray(record, 'monitoring', path, issues, validateClinicalAlert)
}

function validateInteraction(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireEnum(record, 'severity', alertSeverities, path, issues)
  requireStringArray(record, 'withConceptIds', path, issues)
  requireStringArray(record, 'withClasses', path, issues)
  requireString(record, 'mechanism', path, issues)
  requireString(record, 'recommendation', path, issues)
  requireStringArray(record, 'referenceIds', path, issues)
}

function validateReference(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireEnum(record, 'kind', referenceKinds, path, issues)
  requireString(record, 'title', path, issues)
  requireStringArray(record, 'authors', path, issues)
  requireNullableString(record, 'publisher', path, issues)
  const year = requireNullableNumber(record, 'year', path, issues)

  if (typeof year === 'number' && !Number.isInteger(year)) {
    addIssue(issues, `${path}.year`, 'Expected an integer year or null')
  }

  requireNullableString(record, 'edition', path, issues)
  requireNullableString(record, 'doi', path, issues)
  requireNullableString(record, 'pmid', path, issues)
  requireNullableString(record, 'url', path, issues)
  requireNullableString(record, 'jurisdiction', path, issues)
  requireNullableString(record, 'license', path, issues)
  requireNullableString(record, 'accessedAt', path, issues)
}

function validateClinicalReview(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'reviewedAt', path, issues)
  requireStringArray(record, 'reviewerIds', path, issues)
  requireNullableString(record, 'nextReviewAt', path, issues)
}

function validateDrugMonographShape(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'conceptId', path, issues)
  requireString(record, 'locale', path, issues)
  requireString(record, 'slug', path, issues)
  requireString(record, 'primaryName', path, issues)
  const monographStatus = requireEnum(record, 'monographStatus', monographStatuses, path, issues)

  if (record.review === null) {
    if (monographStatus === 'reviewed') {
      addIssue(issues, `${path}.review`, 'Reviewed monographs require review metadata')
    }
  } else {
    validateClinicalReview(record.review, `${path}.review`, issues)
  }

  validateObjectArray(record, 'sections', path, issues, validateRenderableSection)
  validateObjectArray(record, 'speciesEvidence', path, issues, validateSpeciesEvidence)
  validateSafetyInformation(record.safety, `${path}.safety`, issues)
  validateObjectArray(record, 'interactions', path, issues, validateInteraction)
  validateObjectArray(record, 'references', path, issues, validateReference)
}

function validateDataSource(value: unknown, path: string, issues: ValidationIssue[]): void {
  const record = asRecord(value, path, issues)

  if (!record) {
    return
  }

  requireString(record, 'id', path, issues)
  requireEnum(record, 'kind', referenceKinds, path, issues)
  requireString(record, 'publisher', path, issues)
  requireNullableString(record, 'jurisdiction', path, issues)
  requireString(record, 'title', path, issues)
  requireString(record, 'url', path, issues)
  requireNullableString(record, 'license', path, issues)
  requireString(record, 'accessedAt', path, issues)
}

function buildResult<T>(value: unknown, issues: ValidationIssue[]): ValidationResult<T> {
  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, value: value as T }
}

function validateWith<T>(
  value: unknown,
  validateShape: (candidate: unknown, path: string, issues: ValidationIssue[]) => void,
): ValidationResult<T> {
  const issues: ValidationIssue[] = []
  validateShape(value, '$', issues)
  return buildResult<T>(value, issues)
}

export const validateLocaleList: DataValidator<LocaleList> = (value) =>
  validateWith<LocaleList>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'defaultLocale', path, issues)
    validateObjectArray(record, 'locales', path, issues, validateLocaleDefinition)
  })

export const validateLocaleManifest: DataValidator<LocaleManifest> = (value) =>
  validateWith<LocaleManifest>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'locale', path, issues)
    requireString(record, 'label', path, issues)
    requireEnum(record, 'direction', textDirections, path, issues)
    requireString(record, 'schemaVersion', path, issues)
    requireString(record, 'dataVersion', path, issues)
    requireString(record, 'updatedAt', path, issues)
    requireStringArray(record, 'sources', path, issues)
    validateObjectArray(record, 'letters', path, issues, validateManifestLetter)
  })

export const validateAlphabetFile: DataValidator<AlphabetFile> = (value) =>
  validateWith<AlphabetFile>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    validateObjectArray(record, 'letters', path, issues, validateAlphabetLetter)
  })

export const validateUiText: DataValidator<UiText> = (value) =>
  validateWith<UiText>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'appName', path, issues)

    const navigation = asRecord(record.navigation, `${path}.navigation`, issues)
    if (navigation) {
      requireString(navigation, 'home', `${path}.navigation`, issues)
      requireString(navigation, 'locale', `${path}.navigation`, issues)
      requireString(navigation, 'localeShortLabel', `${path}.navigation`, issues)
    }

    const common = asRecord(record.common, `${path}.common`, issues)
    if (common) {
      requireString(common, 'loading', `${path}.common`, issues)
      requireString(common, 'loadError', `${path}.common`, issues)
      requireString(common, 'notAvailable', `${path}.common`, issues)
    }

    const welcome = asRecord(record.welcome, `${path}.welcome`, issues)
    if (welcome) {
      requireString(welcome, 'title', `${path}.welcome`, issues)
      requireString(welcome, 'subtitle', `${path}.welcome`, issues)
    }

    const search = asRecord(record.search, `${path}.search`, issues)
    if (search) {
      requireString(search, 'placeholder', `${path}.search`, issues)
      requireString(search, 'ariaLabel', `${path}.search`, issues)
      requireString(search, 'emptyTitle', `${path}.search`, issues)
      requireString(search, 'emptyBody', `${path}.search`, issues)
      requireString(search, 'resultSummary', `${path}.search`, issues)
      requireString(search, 'limitedResults', `${path}.search`, issues)
    }

    const catalog = asRecord(record.catalog, `${path}.catalog`, issues)
    if (catalog) {
      requireString(catalog, 'eyebrow', `${path}.catalog`, issues)
      requireString(catalog, 'productCount', `${path}.catalog`, issues)
      requireString(catalog, 'searchPrompt', `${path}.catalog`, issues)
      requireString(catalog, 'sourceNotice', `${path}.catalog`, issues)
      requireString(catalog, 'updatedAt', `${path}.catalog`, issues)
    }

    const product = asRecord(record.product, `${path}.product`, issues)
    if (product) {
      requireString(product, 'backToCatalog', `${path}.product`, issues)
      requireString(product, 'recordEyebrow', `${path}.product`, issues)
      requireString(product, 'notFoundTitle', `${path}.product`, issues)
      requireString(product, 'notFoundBody', `${path}.product`, issues)

      const sections = asRecord(product.sections, `${path}.product.sections`, issues)
      if (sections) {
        uiProductSectionKeys.forEach((key) =>
          requireString(sections, key, `${path}.product.sections`, issues),
        )
      }

      const fields = asRecord(product.fields, `${path}.product.fields`, issues)
      if (fields) {
        uiProductFieldKeys.forEach((key) =>
          requireString(fields, key, `${path}.product.fields`, issues),
        )
      }

      const marketingStatus = asRecord(
        product.marketingStatus,
        `${path}.product.marketingStatus`,
        issues,
      )
      if (marketingStatus) {
        marketingStatuses.forEach((key) =>
          requireString(marketingStatus, key, `${path}.product.marketingStatus`, issues),
        )
      }

      const componentLinkStatus = asRecord(
        product.componentLinkStatus,
        `${path}.product.componentLinkStatus`,
        issues,
      )
      if (componentLinkStatus) {
        componentLinkStatuses.forEach((key) =>
          requireString(componentLinkStatus, key, `${path}.product.componentLinkStatus`, issues),
        )
      }

      const componentLinkNote = asRecord(
        product.componentLinkNote,
        `${path}.product.componentLinkNote`,
        issues,
      )
      if (componentLinkNote) {
        componentLinkStatuses.forEach((key) =>
          requireString(componentLinkNote, key, `${path}.product.componentLinkNote`, issues),
        )
      }
    }

    const prescription = asRecord(record.prescription, `${path}.prescription`, issues)
    if (prescription) {
      requireString(prescription, 'title', `${path}.prescription`, issues)
      requireString(prescription, 'clear', `${path}.prescription`, issues)
      requireString(prescription, 'print', `${path}.prescription`, issues)
    }

    const placeholders = asRecord(record.placeholders, `${path}.placeholders`, issues)
    if (placeholders) {
      requireString(placeholders, 'letter', `${path}.placeholders`, issues)
      requireString(placeholders, 'drug', `${path}.placeholders`, issues)
    }
  })

export const validateConceptShard: DataValidator<ConceptShard> = (value) =>
  validateWith<ConceptShard>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'locale', path, issues)
    requireString(record, 'letter', path, issues)
    requireString(record, 'updatedAt', path, issues)
    validateObjectArray(record, 'items', path, issues, validateDrugConcept)
  })

export const validateProductShard: DataValidator<ProductShard> = (value) =>
  validateWith<ProductShard>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'locale', path, issues)
    requireString(record, 'letter', path, issues)
    requireString(record, 'updatedAt', path, issues)
    validateObjectArray(record, 'items', path, issues, validateCommercialProduct)
  })

export const validateProductCatalogManifest: DataValidator<ProductCatalogManifest> =
  (value) =>
    validateWith<ProductCatalogManifest>(value, (candidate, path, issues) => {
      const record = asRecord(candidate, path, issues)

      if (!record) {
        return
      }

      requireString(record, 'locale', path, issues)
      requireString(record, 'schemaVersion', path, issues)
      requireString(record, 'dataVersion', path, issues)
      requireString(record, 'updatedAt', path, issues)
      requireString(record, 'sourceId', path, issues)
      requireNumber(record, 'totalCount', path, issues)
      validateObjectArray(
        record,
        'shards',
        path,
        issues,
        validateProductCatalogManifestShard,
      )
    })

export const validateProductSearchIndex: DataValidator<ProductSearchIndexFile> =
  (value) =>
    validateWith<ProductSearchIndexFile>(value, (candidate, path, issues) => {
      const record = asRecord(candidate, path, issues)

      if (!record) {
        return
      }

      requireString(record, 'locale', path, issues)
      requireString(record, 'schemaVersion', path, issues)
      requireString(record, 'dataVersion', path, issues)
      requireString(record, 'updatedAt', path, issues)
      validateObjectArray(
        record,
        'items',
        path,
        issues,
        validateProductSearchIndexItem,
      )
    })

export const validateLetterFile: DataValidator<LetterFile> = (value) =>
  validateWith<LetterFile>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'locale', path, issues)
    requireString(record, 'letter', path, issues)
    requireString(record, 'updatedAt', path, issues)
    validateObjectArray(record, 'items', path, issues, validateLetterItem)
  })

export const validateSearchIndex: DataValidator<SearchIndexFile> = (value) =>
  validateWith<SearchIndexFile>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    requireString(record, 'locale', path, issues)
    validateObjectArray(record, 'items', path, issues, validateSearchIndexItem)
  })

export const validateDrugMonograph: DataValidator<DrugMonograph> = (value) =>
  validateWith<DrugMonograph>(value, validateDrugMonographShape)

export const validateSourceRegistry: DataValidator<SourceRegistry> = (value) =>
  validateWith<SourceRegistry>(value, (candidate, path, issues) => {
    const record = asRecord(candidate, path, issues)

    if (!record) {
      return
    }

    validateObjectArray(record, 'sources', path, issues, validateDataSource)
  })

function addDuplicateIssues(
  values: readonly string[],
  pathPrefix: string,
  label: string,
  issues: ValidationIssue[],
): void {
  const firstIndexByValue = new Map<string, number>()

  values.forEach((value, index) => {
    const firstIndex = firstIndexByValue.get(value)

    if (firstIndex === undefined) {
      firstIndexByValue.set(value, index)
      return
    }

    addIssue(issues, `${pathPrefix}[${index}]`, `Duplicate ${label} "${value}"; first seen at index ${firstIndex}`)
  })
}

function collectSectionReferenceIds(section: RenderableSection): string[] {
  switch (section.kind) {
    case 'paragraphs':
      return section.paragraphs.flatMap((paragraph) => paragraph.referenceIds)
    case 'list':
      return section.items.flatMap((item) => item.referenceIds)
    case 'table':
      return section.rows.flatMap((row) => row.flatMap((cell) => cell.referenceIds))
    case 'references':
      return section.referenceIds
    case 'doseSummary':
    case 'alerts':
      return []
  }
}

function collectMonographReferenceIds(monograph: DrugMonograph): string[] {
  const sectionReferences = monograph.sections.flatMap(collectSectionReferenceIds)
  const speciesReferences = monograph.speciesEvidence.flatMap((evidence) => [
    ...evidence.referenceIds,
    ...evidence.sections.flatMap(collectSectionReferenceIds),
    ...evidence.dosages.flatMap((dosage) => [
      ...dosage.referenceIds,
      ...dosage.notes.flatMap((note) => note.referenceIds),
    ]),
  ])
  const alertReferences = [
    ...monograph.safety.contraindications,
    ...monograph.safety.warnings,
    ...monograph.safety.adverseEffects,
    ...monograph.safety.monitoring,
  ].flatMap((alert) => alert.referenceIds)
  const interactionReferences = monograph.interactions.flatMap((interaction) => interaction.referenceIds)

  return [...sectionReferences, ...speciesReferences, ...alertReferences, ...interactionReferences]
}

function conceptForId(concepts: Map<string, DrugConcept>, conceptId: string, path: string, issues: ValidationIssue[]) {
  const concept = concepts.get(conceptId)

  if (!concept) {
    addIssue(issues, path, `Unknown concept ID "${conceptId}"`)
  }

  return concept
}

export function validateDatasetRelations(
  value: DrugbookDatasetRelations,
): ValidationResult<DrugbookDatasetRelations> {
  const issues: ValidationIssue[] = []
  const sources = value.sources
  const concepts = value.concepts
  const products = value.products
  const monographs = value.monographs
  const conceptMap = new Map(concepts.map((concept) => [concept.id, concept]))
  const sourceIdSet = new Set(sources.map((source) => source.id))

  addDuplicateIssues(
    sources.map((source) => source.id),
    '$.sources',
    'source ID',
    issues,
  )

  addDuplicateIssues(
    concepts.map((concept) => concept.id),
    '$.concepts',
    'concept ID',
    issues,
  )
  addDuplicateIssues(
    products.map((product) => product.id),
    '$.products',
    'product ID',
    issues,
  )

  concepts.forEach((concept, conceptIndex) => {
    concept.referenceIds.forEach((referenceId, referenceIndex) => {
      if (!sourceIdSet.has(referenceId)) {
        addIssue(
          issues,
          `$.concepts[${conceptIndex}].referenceIds[${referenceIndex}]`,
          `Unknown source ID "${referenceId}"`,
        )
      }
    })

    if (concept.conceptType !== 'combination') {
      return
    }

    const ingredientPath = `$.concepts[${conceptIndex}].ingredientIds`
    const sortedIds = [...concept.ingredientIds].sort((left, right) => left.localeCompare(right, 'en'))

    if (concept.ingredientIds.some((ingredientId, index) => ingredientId !== sortedIds[index])) {
      addIssue(issues, ingredientPath, 'Combination ingredient IDs must be sorted')
    }

    addDuplicateIssues(concept.ingredientIds, ingredientPath, 'combination ingredient ID', issues)

    concept.ingredientIds.forEach((ingredientId, ingredientIndex) => {
      const ingredient = conceptForId(
        conceptMap,
        ingredientId,
        `${ingredientPath}[${ingredientIndex}]`,
        issues,
      )

      if (ingredient && ingredient.conceptType !== 'ingredient') {
        addIssue(
          issues,
          `${ingredientPath}[${ingredientIndex}]`,
          `Expected an ingredient concept, received ${ingredient.conceptType}`,
        )
      }
    })
  })

  products.forEach((product, productIndex) => {
    const productPath = `$.products[${productIndex}]`

    if (!sourceIdSet.has(product.sourceRecord.sourceId)) {
      addIssue(
        issues,
        `${productPath}.sourceRecord.sourceId`,
        `Unknown source ID "${product.sourceRecord.sourceId}"`,
      )
    }

    const linkedConcept = product.conceptId
      ? conceptForId(conceptMap, product.conceptId, `${productPath}.conceptId`, issues)
      : undefined

    product.components.forEach((component, componentIndex) => {
      if (!component.ingredientId) {
        return
      }

      const ingredient = conceptForId(
        conceptMap,
        component.ingredientId,
        `${productPath}.components[${componentIndex}].ingredientId`,
        issues,
      )

      if (ingredient && ingredient.conceptType !== 'ingredient') {
        addIssue(
          issues,
          `${productPath}.components[${componentIndex}].ingredientId`,
          'Product components must link to ingredient concepts',
        )
      }
    })

    if (product.componentLinkStatus === 'verified') {
      if (!linkedConcept) {
        addIssue(issues, `${productPath}.conceptId`, 'Verified products require a valid concept link')
      }

      if (product.components.some((component) => component.ingredientId === null)) {
        addIssue(issues, `${productPath}.components`, 'Verified products require every component to be linked')
      }
    }

    if (linkedConcept?.conceptType === 'combination') {
      const productIngredientIds = product.components
        .map((component) => component.ingredientId)
        .filter((ingredientId): ingredientId is string => ingredientId !== null)
        .sort((left, right) => left.localeCompare(right, 'en'))

      if (productIngredientIds.join('|') !== linkedConcept.ingredientIds.join('|')) {
        addIssue(issues, `${productPath}.components`, 'Product components must match the linked combination')
      }
    }

    if (linkedConcept?.conceptType === 'ingredient') {
      const componentIds = product.components.map((component) => component.ingredientId)

      if (componentIds.length !== 1 || componentIds[0] !== linkedConcept.id) {
        addIssue(issues, `${productPath}.components`, 'Single-ingredient products must match the linked ingredient')
      }
    }
  })

  const verifiedTradeNamesByConcept = new Map<string, Set<string>>()

  products
    .filter((product) => product.componentLinkStatus === 'verified')
    .forEach((product) => {
      const relatedConceptIds = new Set([
        ...(product.conceptId ? [product.conceptId] : []),
        ...product.components
          .map((component) => component.ingredientId)
          .filter((ingredientId): ingredientId is string => ingredientId !== null),
      ])

      relatedConceptIds.forEach((conceptId) => {
        const tradeNames = verifiedTradeNamesByConcept.get(conceptId) ?? new Set<string>()
        tradeNames.add(product.tradeName)
        verifiedTradeNamesByConcept.set(conceptId, tradeNames)
      })
    })

  const expectedTradeNames = (conceptId: string): string[] =>
    [...(verifiedTradeNamesByConcept.get(conceptId) ?? [])].sort((left, right) =>
      left.localeCompare(right, 'pt-BR'),
    )
  const validateDerivedTradeNames = (
    conceptId: string,
    tradeNames: string[],
    path: string,
  ): void => {
    if (tradeNames.join('|') !== expectedTradeNames(conceptId).join('|')) {
      addIssue(
        issues,
        path,
        'Trade names must match verified commercial-product relationships',
      )
    }
  }

  const letterItems = value.letters.flatMap((letter) => letter.items)
  addDuplicateIssues(
    letterItems.map((item) => item.conceptId),
    '$.letters.items',
    'letter concept ID',
    issues,
  )

  letterItems.forEach((item, itemIndex) => {
    const concept = conceptForId(conceptMap, item.conceptId, `$.letters.items[${itemIndex}].conceptId`, issues)

    if (concept && concept.conceptType !== item.conceptType) {
      addIssue(issues, `$.letters.items[${itemIndex}].conceptType`, 'Concept type does not match catalog concept')
    }

    validateDerivedTradeNames(
      item.conceptId,
      item.tradeNames,
      `$.letters.items[${itemIndex}].tradeNames`,
    )
  })

  addDuplicateIssues(
    value.searchIndex.items.map((item) => item.conceptId),
    '$.searchIndex.items',
    'search concept ID',
    issues,
  )

  const searchConceptIds = new Set(value.searchIndex.items.map((item) => item.conceptId))
  letterItems.forEach((item, itemIndex) => {
    if (!searchConceptIds.has(item.conceptId)) {
      addIssue(issues, `$.letters.items[${itemIndex}].conceptId`, 'Letter item is missing from the search index')
    }
  })

  value.searchIndex.items.forEach((item, itemIndex) => {
    const concept = conceptForId(
      conceptMap,
      item.conceptId,
      `$.searchIndex.items[${itemIndex}].conceptId`,
      issues,
    )

    if (concept && concept.conceptType !== item.conceptType) {
      addIssue(
        issues,
        `$.searchIndex.items[${itemIndex}].conceptType`,
        'Concept type does not match catalog concept',
      )
    }

    validateDerivedTradeNames(
      item.conceptId,
      item.tradeNames,
      `$.searchIndex.items[${itemIndex}].tradeNames`,
    )
  })

  addDuplicateIssues(
    monographs.map((monograph) => monograph.conceptId),
    '$.monographs',
    'monograph concept ID',
    issues,
  )
  addDuplicateIssues(
    monographs.map((monograph) => monograph.slug),
    '$.monographs',
    'monograph slug',
    issues,
  )

  monographs.forEach((monograph, monographIndex) => {
    const monographPath = `$.monographs[${monographIndex}]`
    conceptForId(conceptMap, monograph.conceptId, `${monographPath}.conceptId`, issues)

    if (monograph.monographStatus === 'reviewed' && !monograph.review) {
      addIssue(issues, `${monographPath}.review`, 'Reviewed monographs require review metadata')
    }

    const referenceIds = monograph.references.map((reference) => reference.id)
    addDuplicateIssues(referenceIds, `${monographPath}.references`, 'reference ID', issues)
    const referenceIdSet = new Set(referenceIds)

    collectMonographReferenceIds(monograph).forEach((referenceId) => {
      if (!referenceIdSet.has(referenceId)) {
        addIssue(issues, monographPath, `Unknown monograph reference ID "${referenceId}"`)
      }
    })
  })

  return buildResult(value, issues)
}

export function formatValidationIssues(issues: readonly ValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')
}
