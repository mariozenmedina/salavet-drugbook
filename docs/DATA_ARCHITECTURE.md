# Data Architecture

Drugbook data should be static JSON, split by locale and by the drug's first letter. The proposed folder is `public/data`, so Vite can serve files without mixing translatable data with components in `src`.

## Proposed Structure

```text
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
        b.json
```

## `locales.json`

Available locale list.

```json
{
  "defaultLocale": "pt-BR",
  "locales": [
    {
      "code": "pt-BR",
      "label": "Portuguese (Brazil)",
      "nativeLabel": "Portugues (Brasil)"
    }
  ]
}
```

## `manifest.json`

Locale metadata.

```json
{
  "locale": "pt-BR",
  "label": "Portuguese (Brazil)",
  "direction": "ltr",
  "dataVersion": "0.1.0",
  "updatedAt": "2026-06-29",
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

## `ui.json`

Translatable interface text.

```json
{
  "appName": "Sala Vet Drugbook",
  "search": {
    "placeholder": "Buscar medicamentos",
    "empty": "Nenhum medicamento encontrado"
  },
  "prescription": {
    "title": "Receituario",
    "clear": "Limpar receituario",
    "print": "Imprimir"
  }
}
```

## `alphabet.json`

Locale alphabet. The UI must use this file instead of hardcoded letters.

```json
{
  "letters": [
    {
      "id": "a",
      "label": "A",
      "sortKey": "a"
    }
  ]
}
```

## `search-index.json`

Small index for global search.

```json
{
  "locale": "pt-BR",
  "items": [
    {
      "id": "abamectin-derquantel",
      "slug": "abamectin-derquantel",
      "letter": "a",
      "primaryName": "Abamectina + derquantel",
      "tradeNames": ["Startect"],
      "synonyms": ["Abamectin - Derquantel"],
      "components": ["abamectina", "derquantel"],
      "species": ["sheep"],
      "path": "/pt-BR/drug/abamectin-derquantel"
    }
  ]
}
```

## `letters/{letter}.json`

File with all drugs for that letter.

```json
{
  "locale": "pt-BR",
  "letter": "a",
  "updatedAt": "2026-06-29",
  "items": [
    {
      "id": "abamectin-derquantel",
      "slug": "abamectin-derquantel",
      "primaryName": "Abamectina + derquantel",
      "tradeNames": ["Startect"],
      "synonyms": ["Abamectin - Derquantel"],
      "components": ["abamectina", "derquantel"],
      "classification": ["Anthelmintico"],
      "summary": "Resumo revisado em linguagem propria.",
      "reviewStatus": "needsReview",
      "sections": [],
      "dosages": [],
      "safety": {
        "contraindications": [],
        "warnings": [],
        "adverseEffects": [],
        "monitoring": []
      },
      "interactions": [],
      "references": []
    }
  ]
}
```

Schema keys and IDs stay in English. Values shown to users can be localized inside the locale folder.

## Review Status

Use closed enum values:

- `draft`: manually created or imported, still incomplete.
- `needsReview`: needs editorial/clinical review before broad use.
- `reviewed`: reviewed for display.
- `calculatorReady`: reviewed and approved for the calculator.

The calculator can only use `calculatorReady` dosages.

## Renderable Sections

Avoid raw HTML. Components should render typed blocks.

```json
{
  "id": "pharmacodynamics",
  "title": "Farmacodinamica",
  "kind": "list",
  "items": [
    {
      "text": "Texto em linguagem propria.",
      "referenceIds": ["ref-001"]
    }
  ]
}
```

Initial block types:

- `paragraphs`
- `list`
- `table`
- `doseSummary`
- `alerts`
- `references`

## Dosages

Dosages should be structured for calculation and warnings.

```json
{
  "id": "dose-dog-gerd-po",
  "reviewStatus": "needsReview",
  "species": "dog",
  "indication": "Refluxo gastroesofagico",
  "route": "PO",
  "dose": {
    "min": 0.7,
    "max": 0.7,
    "unit": "mg/kg"
  },
  "frequency": "q24h",
  "duration": null,
  "maxDose": null,
  "requiredPatientFields": ["weightKg"],
  "notes": [],
  "referenceIds": ["ref-001"]
}
```

## Clinical Alerts

Alerts must be structured for the monograph, calculator, and prescription page.

```json
{
  "id": "alert-horse-derquantel",
  "severity": "danger",
  "appliesTo": {
    "species": ["horse"]
  },
  "message": "Nao usar em equinos.",
  "recommendation": "Escolher alternativa terapeutica.",
  "referenceIds": ["ref-001"]
}
```

Severities:

- `info`
- `caution`
- `warning`
- `danger`

## Interactions

Interactions should be comparable on the prescription page.

```json
{
  "id": "interaction-example",
  "severity": "warning",
  "withDrugIds": ["other-drug"],
  "withClasses": [],
  "mechanism": "Potencializacao de sedacao.",
  "recommendation": "Monitorar o paciente e ajustar dose se necessario.",
  "referenceIds": ["ref-001"]
}
```

## References

```json
{
  "id": "ref-001",
  "label": "Fonte bibliografica em formato curto",
  "type": "book",
  "year": 2026,
  "url": null,
  "accessedAt": null
}
```

## LocalStorage

Planned keys:

- `salavet-drugbook:settings:v1`
- `salavet-drugbook:prescription:v1`

Values must include `schemaVersion` for future migrations.
