# Data Contribution Guide

This project will be public and should receive translation and new-drug contributions through PRs.

## Contribution Types

- Translate an existing locale.
- Add a new locale.
- Add a drug.
- Fix dosage, warning, interaction, or reference data.
- Improve interface text.

## Locale Rules

- Each locale lives in `public/data/{locale}`.
- The default end-user locale is `pt-BR`.
- Every locale needs `manifest.json`, `ui.json`, `alphabet.json`, and `search-index.json`.
- Letter files live in `letters/{letter}.json`.
- The alphabet must come from `alphabet.json`, not from the front-end code.

## Drug Rules

- Register drugs by compound/generic name in `primaryName`.
- Trade names go in `tradeNames`.
- Synonyms, alternate spellings, and names in other languages go in `synonyms`.
- Combination drugs should fill `components`.
- Every dosage needs species, route, dose range, unit, frequency, and reference.
- Every dosage used by the calculator must be `calculatorReady`.
- Warnings and interactions need severity and references whenever possible.

## Clinical Review

High-risk fields should not be accepted without review:

- Dosages.
- Maximum dosage.
- Contraindications.
- Interactions.
- Withdrawal time.
- Pregnancy/lactation use.
- Age, kidney, or liver adjustments.

## Sources and License

- Do not copy raw text from proprietary sources without permission.
- Prefer summaries in original wording with references.
- Register sources in the `references` array.
- Imported data must start as `needsReview`.

## Drug PR Checklist

- [ ] File is under the correct letter.
- [ ] `slug` is unique within the locale.
- [ ] `primaryName` uses the compound/generic name.
- [ ] `tradeNames` and `synonyms` are filled when known.
- [ ] Sections use structured blocks, not raw HTML.
- [ ] Dosages include references.
- [ ] Warnings and interactions include severity.
- [ ] `search-index.json` was updated.
- [ ] Data validation passed.

## Translation PR Checklist

- [ ] New locale has `manifest.json`.
- [ ] New locale has `ui.json`.
- [ ] New locale has `alphabet.json`.
- [ ] Letter files follow the same structure.
- [ ] Slugs and IDs are consistent with the base locale or document the difference.
- [ ] Search finds primary names, trade names, and synonyms.
