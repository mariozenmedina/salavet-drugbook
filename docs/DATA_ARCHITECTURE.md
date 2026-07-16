# Data Architecture

Sala Vet Drugbook separates regulatory product inventory from clinical editorial content. A commercial product, an active ingredient, a fixed combination, and a clinical monograph are different records with different update and review lifecycles.

The application serves static JSON split by locale and by small catalog shards. End-user data remains under `public/data/{locale}` so that every displayed value can be translated or localized without changing schema keys.

## Design Principles

- Product registration facts come from identified regulatory sources and retain jurisdiction and provenance.
- Trade names belong to commercial product records, not directly to ingredients.
- Ingredient-to-trade-name lists are generated relationships used by search and monograph views.
- A fixed combination links to each ingredient and may have its own clinical monograph.
- Clinical claims are written in original wording and cite one or more references.
- Imported product metadata and reviewed clinical evidence use separate status fields.
- Missing component links remain unresolved; importers must not guess them into reviewed data.
- Public files are generated deterministically and reviewed through pull requests.

## Proposed Structure

```text
data/
  imports/
    mapa-products/
      ingredient-aliases.json
      product-overrides.json
      ignored-records.json
  source-registry.json
public/
  data/
    locales.json
    pt-BR/
      manifest.json
      ui.json
      alphabet.json
      search-index.json
      letters/
        a.json
      catalog/
        concepts/
          a.json
        products/
          a.json
      monographs/
        carprofeno.json
scripts/
  import-mapa-products.ts
  build-data.ts
  validate-data.ts
tests/
  fixtures/
    mapa-products/
```

`data/imports` contains developer-facing normalization rules and import state. It is not served to users. Generated and editorial end-user content lives under the matching locale folder in `public/data`.

Large upstream files should not be committed until their size, update frequency, license, and retention requirements have been reviewed. Each import run must still record the upstream URL, retrieval time, and content hash.

## Public File Envelopes

Every public JSON file is validated at runtime before the application returns it to a component or store. Loaders reject non-successful HTTP responses, invalid JSON, unsafe path segments, and schema mismatches with path-aware issues such as `$.items[0].conceptId`.

Catalog shards use a consistent envelope:

```json
{
  "locale": "pt-BR",
  "letter": "a",
  "updatedAt": "2026-07-16T12:00:00Z",
  "items": []
}
```

The envelope applies independently to `catalog/concepts/{letter}.json`, `catalog/products/{letter}.json`, and `letters/{letter}.json`. Item schemas differ, but locale, shard key, update time, and item collection are always explicit.

Validation has two layers:

1. **Structural validation** checks required fields, scalar types, enum values, nested arrays, review metadata, dose ranges, and source records in each JSON file.
2. **Relationship validation** checks unique IDs, sorted combination components, ingredient/product/concept links, letter and search coverage, monograph links, and monograph reference IDs across the assembled dataset.

Runtime types and validation code live in `src/types/drugbook.ts` and `src/services/dataValidation.ts`. Typed loaders live in `src/services/drugbookData.ts`.

## Entity Relationships

```text
Ingredient concept ─┐
                    ├── Commercial product ── Source record
Ingredient concept ─┘           │
                                └── derived trade-name search entries

Ingredient concept ─┐
                    ├── Fixed-combination concept ── Clinical monograph
Ingredient concept ─┘

Ingredient concept ──────────────────────────────── Clinical monograph
```

A single-ingredient product usually resolves to one ingredient concept. A multi-ingredient product resolves to a stable combination concept whose component IDs are sorted and unique. Products that cannot be resolved safely stay in the catalog with `componentLinkStatus: "unmatched"` and do not populate clinical relationships.

## Locale Manifest

`manifest.json` describes the generated locale dataset and lets the service worker invalidate old caches.

```json
{
  "locale": "pt-BR",
  "label": "Portuguese (Brazil)",
  "direction": "ltr",
  "schemaVersion": "1.0.0",
  "dataVersion": "2026.07.16.1",
  "updatedAt": "2026-07-16T12:00:00Z",
  "sources": ["mapa-veterinary-products"],
  "letters": [
    {
      "id": "a",
      "label": "A",
      "path": "/data/pt-BR/letters/a.json",
      "count": 0
    }
  ]
}
```

## Drug Concepts

A drug concept is either one active ingredient or a defined fixed combination. IDs are stable and must not depend on a translated display name.

### Ingredient Concept

```json
{
  "id": "ingredient-carprofen",
  "conceptType": "ingredient",
  "primaryName": "Carprofeno",
  "normalizedName": "carprofeno",
  "synonyms": ["Carprofen"],
  "externalIdentifiers": [],
  "catalogStatus": "normalized",
  "referenceIds": ["source-mapa-veterinary-products"]
}
```

Ingredient salts, esters, solvates, and active moieties require explicit normalization rules. They must not be collapsed automatically when the distinction affects strength, formulation, or clinical use.

### Fixed-Combination Concept

```json
{
  "id": "combination-amoxicillin-clavulanate",
  "conceptType": "combination",
  "primaryName": "Amoxicilina + clavulanato de potássio",
  "normalizedName": "amoxicilina clavulanato de potassio",
  "ingredientIds": [
    "ingredient-amoxicillin",
    "ingredient-potassium-clavulanate"
  ],
  "synonyms": [],
  "catalogStatus": "verified",
  "referenceIds": ["source-mapa-veterinary-products"]
}
```

The ingredient ID list is sorted before generating a combination key. A combination is not represented as a synthetic ingredient.

## Commercial Products

Commercial products are jurisdiction-specific. Their registration status does not establish approval in another country and does not establish that every clinical use in a monograph is on-label.

```json
{
  "id": "product-br-mapa-example-registration",
  "tradeName": "Example Vet",
  "jurisdiction": "BR",
  "regulatoryAuthority": "MAPA",
  "registrationNumber": "example-registration",
  "marketingStatus": "registered",
  "holder": "Example Holder",
  "conceptId": "ingredient-carprofen",
  "components": [
    {
      "ingredientId": "ingredient-carprofen",
      "sourceIngredientName": "CARPROFENO",
      "role": "active",
      "strength": null
    }
  ],
  "componentLinkStatus": "verified",
  "dosageForms": [],
  "routes": [],
  "authorizedSpecies": [],
  "sourceRecord": {
    "sourceId": "mapa-veterinary-products",
    "recordId": "example-registration",
    "retrievedAt": "2026-07-16T12:00:00Z",
    "contentHash": "sha256:example"
  }
}
```

Fields absent from the upstream dataset remain empty or `null`. Importers must not infer formulation, strength, route, species, marketing status, or ingredient composition from a trade name alone.

## Letter Files

`letters/{letter}.json` is a lightweight, localized list of drug concepts. It is derived from catalog concepts and monograph availability, not used as the editorial source of truth.

```json
{
  "locale": "pt-BR",
  "letter": "c",
  "updatedAt": "2026-07-16T12:00:00Z",
  "items": [
    {
      "conceptId": "ingredient-carprofen",
      "slug": "carprofeno",
      "primaryName": "Carprofeno",
      "conceptType": "ingredient",
      "tradeNames": ["Example Vet"],
      "synonyms": ["Carprofen"],
      "species": ["dog"],
      "monographStatus": "reviewed",
      "path": "/pt-BR/drug/carprofeno"
    }
  ]
}
```

`tradeNames` is generated from verified product relationships. Editors do not maintain it by hand in letter or search files.

## Search Index

The global index is also generated. It searches ingredient and combination names, synonyms, and related verified trade names.

Search normalization uses Unicode decomposition, removes diacritical marks, applies locale-aware lowercase conversion, normalizes punctuation and whitespace, and sorts equal-ranked results deterministically. Multi-token queries can match across component names while exact and prefix matches rank above generic substring matches.

```json
{
  "locale": "pt-BR",
  "items": [
    {
      "conceptId": "ingredient-carprofen",
      "slug": "carprofeno",
      "letter": "c",
      "primaryName": "Carprofeno",
      "conceptType": "ingredient",
      "tradeNames": ["Example Vet"],
      "synonyms": ["Carprofen"],
      "componentNames": ["Carprofeno"],
      "species": ["dog"],
      "monographStatus": "reviewed",
      "path": "/pt-BR/drug/carprofeno"
    }
  ]
}
```

## Clinical Monographs

A monograph belongs to a drug concept and a locale. Regulatory product metadata may be imported automatically, but clinical statements require references and editorial review.

```json
{
  "conceptId": "ingredient-carprofen",
  "locale": "pt-BR",
  "slug": "carprofeno",
  "primaryName": "Carprofeno",
  "monographStatus": "reviewed",
  "review": {
    "reviewedAt": "2026-07-16",
    "reviewerIds": ["reviewer-example"],
    "nextReviewAt": "2027-07-16"
  },
  "sections": [],
  "speciesEvidence": [],
  "safety": {
    "contraindications": [],
    "warnings": [],
    "adverseEffects": [],
    "monitoring": []
  },
  "interactions": [],
  "references": []
}
```

Draft catalog entries may be visible as incomplete records, but unreviewed clinical claims and dosage instructions must not be presented as reviewed guidance.

## Species-Specific Evidence

Clinical information is reviewed per drug concept and species. One drug can therefore be complete for dogs and still have no approved content for cats, horses, or production animals.

```json
{
  "id": "evidence-carprofen-dog-example",
  "species": "dog",
  "indication": "Example reviewed indication",
  "regulatoryContext": {
    "jurisdiction": "BR",
    "useType": "unknown"
  },
  "reviewStatus": "reviewed",
  "sections": [],
  "dosages": [],
  "referenceIds": ["ref-example"]
}
```

`useType` is one of `onLabel`, `offLabel`, or `unknown`. It is always evaluated for an explicit jurisdiction. Evidence from a foreign label does not make a use on-label in Brazil.

## Dosages

V1 may display reviewed, species-specific dosage information inside a monograph, but it does not calculate patient doses. Calculator approval remains a separate future gate.

```json
{
  "id": "dose-example",
  "reviewStatus": "reviewed",
  "calculatorStatus": "notEvaluated",
  "species": "dog",
  "indication": "Example reviewed indication",
  "route": "PO",
  "dose": {
    "min": 1,
    "max": 2,
    "unit": "mg/kg"
  },
  "frequency": "q24h",
  "duration": null,
  "maxDose": null,
  "notes": [],
  "referenceIds": ["ref-example"]
}
```

Only a later clinical workflow can change `calculatorStatus` to `calculatorReady`.

## Renderable Sections

Avoid raw HTML. Components render typed blocks such as:

- `paragraphs`
- `list`
- `table`
- `doseSummary`
- `alerts`
- `references`

Every clinical statement or table row supports `referenceIds` so the UI can show traceable evidence.

## Status Models

Catalog normalization and clinical review are independent.

### Catalog Status

- `imported`: copied from an allowed source with provenance but not normalized.
- `normalized`: names and identifiers were normalized by deterministic rules.
- `verified`: a human verified the concept or product relationship.
- `retired`: no longer current in the upstream source but retained for history.

### Component Link Status

- `unmatched`: no safe ingredient or combination link exists.
- `candidate`: automation proposed a link for review.
- `verified`: a human or an approved deterministic mapping verified the link.

### Monograph and Clinical Evidence Status

- `draft`: incomplete editorial content.
- `needsReview`: ready for clinical/editorial review.
- `reviewed`: approved for user-facing drugbook display.

### Calculator Status

- `notEvaluated`: not assessed for calculation.
- `needsReview`: structured but not approved for calculation.
- `calculatorReady`: approved through the future calculator review process.

The v1 drugbook never treats catalog import status as clinical review.

## Provenance and References

Regulatory source metadata and clinical references are both traceable, but they serve different purposes.

```json
{
  "id": "source-mapa-veterinary-products",
  "kind": "regulatoryDataset",
  "publisher": "Ministry of Agriculture and Livestock of Brazil",
  "jurisdiction": "BR",
  "title": "MAPA veterinary product export",
  "url": "https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/produtos-veterinarios/paineis-de-bi-do-mapa",
  "license": "Pending source-specific review",
  "accessedAt": "2026-07-16"
}
```

Clinical references add bibliographic fields such as authors, year, DOI, PMID, edition, label revision, and access date as appropriate. A source registry documents whether a source permits automated access, factual extraction, quotation, redistribution, or only citation.

## Import and Publication Flow

1. A manual or scheduled workflow downloads an allowed regulatory dataset.
2. The workflow records retrieval metadata and verifies the source format.
3. The importer normalizes rows deterministically and applies reviewed aliases or overrides.
4. Unmatched values enter an editorial queue; they are not silently discarded or guessed.
5. Generated public files are validated for schema, IDs, relationships, sorting, references, and duplicate registrations.
6. Automation opens or updates a draft pull request containing the data diff and an import report.
7. A human reviews and merges the product inventory changes.
8. Separate issues and pull requests enrich one drug concept and species at a paced rate.

No ingestion workflow pushes directly to the default branch.

The initial MAPA adapter is limited to pharmaceutical inventory facts and must not bulk-import label-like `Modo de Uso`, `Advertência`, or `Indicação` text as clinical monographs. Biological products such as vaccines, diagnostic kits, antigens, organisms, and diluents require a separate product model and must not be forced into chemical ingredient or fixed-combination records.

## Fixture Data

The initial `pt-BR` data is deliberately fictitious and exists only to exercise schemas, loaders, search, and relationship validation. Fixture products use `marketingStatus: "unknown"` and a local fixture source. The example monograph remains `needsReview`, contains no dosage or clinical recommendation, and must be replaced by sourced editorial data rather than promoted to reviewed status.

## PWA Data Strategy

- Precache the app shell, locale manifest, UI strings, alphabet, and compact search index.
- Cache letter files and monographs on demand after successful responses.
- Version every generated dataset so the service worker can invalidate stale entries.
- Display the data version, monograph review date, and offline state where clinically relevant.
- Do not claim freshness while offline; cached regulatory and clinical information retains its recorded update dates.

## Local Storage

Planned keys remain versioned:

- `salavet-drugbook:settings:v1`
- `salavet-drugbook:pwa-data:v1`
- `salavet-drugbook:prescription:v1` after the prescription feature is implemented post-v1.

Stored values include `schemaVersion` for future migrations.
