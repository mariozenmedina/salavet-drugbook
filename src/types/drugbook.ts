export type TextDirection = 'ltr' | 'rtl'

export type DrugConceptType = 'ingredient' | 'combination'

export type CatalogStatus = 'imported' | 'normalized' | 'verified' | 'retired'

export type ComponentLinkStatus = 'unmatched' | 'candidate' | 'verified'

export type MonographStatus = 'draft' | 'needsReview' | 'reviewed'

export type ClinicalReviewStatus = 'draft' | 'needsReview' | 'reviewed'

export type CalculatorStatus = 'notEvaluated' | 'needsReview' | 'calculatorReady'

export type MarketingStatus = 'registered' | 'suspended' | 'cancelled' | 'unknown'

export type RegulatoryUseType = 'onLabel' | 'offLabel' | 'unknown'

export type AlertSeverity = 'info' | 'caution' | 'warning' | 'danger'

export type ProductComponentRole = 'active'

export type SectionKind =
  | 'paragraphs'
  | 'list'
  | 'table'
  | 'doseSummary'
  | 'alerts'
  | 'references'

export type ReferenceKind =
  | 'book'
  | 'database'
  | 'guideline'
  | 'journalArticle'
  | 'regulatoryDataset'
  | 'regulatoryLabel'
  | 'website'

export interface LocaleDefinition {
  code: string
  label: string
  nativeLabel: string
}

export interface LocaleList {
  defaultLocale: string
  locales: LocaleDefinition[]
}

export interface LocaleManifestLetter {
  id: string
  label: string
  path: string
  count: number
}

export interface LocaleManifest {
  locale: string
  label: string
  direction: TextDirection
  schemaVersion: string
  dataVersion: string
  updatedAt: string
  sources: string[]
  letters: LocaleManifestLetter[]
}

export interface AlphabetLetter {
  id: string
  label: string
  sortKey: string
}

export interface AlphabetFile {
  letters: AlphabetLetter[]
}

export interface UiText {
  appName: string
  welcome: {
    title: string
    subtitle: string
  }
  search: {
    placeholder: string
    empty: string
  }
  prescription: {
    title: string
    clear: string
    print: string
  }
  placeholders: {
    letter: string
    drug: string
  }
}

export interface ExternalIdentifier {
  system: string
  value: string
}

interface DrugConceptBase {
  id: string
  conceptType: DrugConceptType
  primaryName: string
  normalizedName: string
  synonyms: string[]
  externalIdentifiers: ExternalIdentifier[]
  catalogStatus: CatalogStatus
  referenceIds: string[]
}

export interface IngredientConcept extends DrugConceptBase {
  conceptType: 'ingredient'
}

export interface CombinationConcept extends DrugConceptBase {
  conceptType: 'combination'
  ingredientIds: string[]
}

export type DrugConcept = IngredientConcept | CombinationConcept

export interface ConceptShard {
  locale: string
  letter: string
  updatedAt: string
  items: DrugConcept[]
}

export interface ProductStrength {
  value: number
  unit: string
  perValue: number | null
  perUnit: string | null
}

export interface ProductComponent {
  ingredientId: string | null
  sourceIngredientName: string
  role: ProductComponentRole
  strength: ProductStrength | null
}

export interface RegulatorySourceRecord {
  sourceId: string
  recordId: string
  retrievedAt: string
  contentHash: string
}

export interface CommercialProduct {
  id: string
  tradeName: string
  jurisdiction: string
  regulatoryAuthority: string
  registrationNumber: string | null
  previousRegistrationNumber: string | null
  marketingStatus: MarketingStatus
  holderRegistrationNumber: string | null
  holder: string | null
  conceptId: string | null
  components: ProductComponent[]
  componentLinkStatus: ComponentLinkStatus
  dosageForms: string[]
  pharmaceuticalClasses: string[]
  routes: string[]
  authorizedSpecies: string[]
  origin: string | null
  sourceRecord: RegulatorySourceRecord
}

export interface ProductShard {
  locale: string
  letter: string
  updatedAt: string
  items: CommercialProduct[]
}

export interface ProductCatalogManifestShard {
  id: string
  label: string
  path: string
  count: number
}

export interface ProductCatalogManifest {
  locale: string
  schemaVersion: string
  dataVersion: string
  updatedAt: string
  sourceId: string
  totalCount: number
  shards: ProductCatalogManifestShard[]
}

export interface ProductSearchIndexItem {
  productId: string
  tradeName: string
  normalizedTradeName: string
  registrationNumber: string | null
  previousRegistrationNumber: string | null
  marketingStatus: MarketingStatus
  holder: string | null
  componentNames: string[]
  pharmaceuticalClasses: string[]
  species: string[]
  shard: string
  path: string
}

export interface ProductSearchIndexFile {
  locale: string
  schemaVersion: string
  dataVersion: string
  updatedAt: string
  items: ProductSearchIndexItem[]
}

export interface LetterItem {
  conceptId: string
  slug: string
  primaryName: string
  conceptType: DrugConceptType
  tradeNames: string[]
  synonyms: string[]
  species: string[]
  monographStatus: MonographStatus
  path: string
}

export interface LetterFile {
  locale: string
  letter: string
  updatedAt: string
  items: LetterItem[]
}

export interface SearchIndexItem extends LetterItem {
  letter: string
  componentNames: string[]
}

export interface SearchIndexFile {
  locale: string
  items: SearchIndexItem[]
}

export interface ReferencedText {
  text: string
  referenceIds: string[]
}

interface SectionBase {
  id: string
  title: string
  kind: SectionKind
}

export interface ParagraphsSection extends SectionBase {
  kind: 'paragraphs'
  paragraphs: ReferencedText[]
}

export interface ListSection extends SectionBase {
  kind: 'list'
  items: ReferencedText[]
}

export type TableCell = ReferencedText

export interface TableSection extends SectionBase {
  kind: 'table'
  headers: string[]
  rows: TableCell[][]
}

export interface DoseSummarySection extends SectionBase {
  kind: 'doseSummary'
  dosageIds: string[]
}

export interface AlertsSection extends SectionBase {
  kind: 'alerts'
  alertIds: string[]
}

export interface ReferencesSection extends SectionBase {
  kind: 'references'
  referenceIds: string[]
}

export type RenderableSection =
  | ParagraphsSection
  | ListSection
  | TableSection
  | DoseSummarySection
  | AlertsSection
  | ReferencesSection

export interface DoseRange {
  min: number
  max: number
  unit: string
}

export interface MaximumDose {
  value: number
  unit: string
}

export interface Dosage {
  id: string
  reviewStatus: ClinicalReviewStatus
  calculatorStatus: CalculatorStatus
  species: string
  indication: string
  route: string
  dose: DoseRange
  frequency: string
  duration: string | null
  maxDose: MaximumDose | null
  requiredPatientFields: string[]
  notes: ReferencedText[]
  referenceIds: string[]
}

export interface RegulatoryContext {
  jurisdiction: string
  useType: RegulatoryUseType
}

export interface SpeciesEvidence {
  id: string
  species: string
  indication: string
  regulatoryContext: RegulatoryContext
  reviewStatus: ClinicalReviewStatus
  sections: RenderableSection[]
  dosages: Dosage[]
  referenceIds: string[]
}

export interface AlertApplicability {
  species: string[]
}

export interface ClinicalAlert {
  id: string
  severity: AlertSeverity
  appliesTo: AlertApplicability
  message: string
  recommendation: string
  referenceIds: string[]
}

export interface SafetyInformation {
  contraindications: ClinicalAlert[]
  warnings: ClinicalAlert[]
  adverseEffects: ClinicalAlert[]
  monitoring: ClinicalAlert[]
}

export interface Interaction {
  id: string
  severity: AlertSeverity
  withConceptIds: string[]
  withClasses: string[]
  mechanism: string
  recommendation: string
  referenceIds: string[]
}

export interface Reference {
  id: string
  kind: ReferenceKind
  title: string
  authors: string[]
  publisher: string | null
  year: number | null
  edition: string | null
  doi: string | null
  pmid: string | null
  url: string | null
  jurisdiction: string | null
  license: string | null
  accessedAt: string | null
}

export interface ClinicalReview {
  reviewedAt: string
  reviewerIds: string[]
  nextReviewAt: string | null
}

export interface DrugMonograph {
  conceptId: string
  locale: string
  slug: string
  primaryName: string
  monographStatus: MonographStatus
  review: ClinicalReview | null
  sections: RenderableSection[]
  speciesEvidence: SpeciesEvidence[]
  safety: SafetyInformation
  interactions: Interaction[]
  references: Reference[]
}

export interface DataSourceDefinition {
  id: string
  kind: ReferenceKind
  publisher: string
  jurisdiction: string | null
  title: string
  url: string
  license: string | null
  accessedAt: string
}

export interface SourceRegistry {
  sources: DataSourceDefinition[]
}

export interface DrugbookDatasetRelations {
  sources: DataSourceDefinition[]
  concepts: DrugConcept[]
  products: CommercialProduct[]
  letters: LetterFile[]
  searchIndex: SearchIndexFile
  monographs: DrugMonograph[]
}
