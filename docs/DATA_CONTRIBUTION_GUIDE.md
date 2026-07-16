# Data Contribution Guide

This project will be public and should receive translation and new-drug contributions through PRs.

## Contribution Types

- Translate an existing locale.
- Add a new locale.
- Add or normalize an active ingredient or fixed combination.
- Add or correct a commercial product relationship.
- Add a species-specific drug monograph.
- Fix dosage, warning, interaction, or reference data.
- Improve interface text.

## Locale Rules

- Each locale lives in `public/data/{locale}`.
- The default end-user locale is `pt-BR`.
- Every locale needs `manifest.json`, `ui.json`, `alphabet.json`, and `search-index.json`.
- Letter files live in `letters/{letter}.json`.
- The alphabet must come from `alphabet.json`, not from the front-end code.

## Catalog and Monograph Rules

- Active ingredients and fixed combinations are stable drug concepts.
- Register ingredient concepts by compound/generic name in localized `primaryName` fields.
- Trade names belong to commercial product records and link to their verified ingredient or combination concept.
- Letter and search indexes derive `tradeNames` from verified product relationships; do not maintain those arrays manually.
- Synonyms, alternate spellings, and names in other languages go in `synonyms`.
- Fixed combinations contain a sorted, unique list of `ingredientIds`; do not create a synthetic ingredient for a combination.
- Commercial products retain jurisdiction, regulatory authority, registration number, holder, source record, and component-link status.
- Do not infer composition, strength, formulation, route, species, or approval from a trade name alone.
- Clinical monographs belong to one drug concept and one locale.
- Every dosage needs species, route, dose range, unit, frequency, and reference.
- V1 can display only reviewed clinical dosage content. A future calculator requires the separate `calculatorReady` gate.
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
- Imported regulatory data must include provenance and start as `imported` until normalized.
- Imported catalog status never implies clinical review.
- Follow [the source and licensing policy](SOURCE_POLICY.md) for automated access and reuse decisions.

## Drug PR Checklist

- [ ] The concept and monograph files are under the correct locale and shard.
- [ ] Concept ID and `slug` are unique and stable.
- [ ] `primaryName` uses the localized compound/generic or fixed-combination name.
- [ ] Trade names come from verified commercial product relationships.
- [ ] Commercial product jurisdiction and provenance are present.
- [ ] Fixed-combination ingredient IDs are sorted and unique.
- [ ] `synonyms` contains only verified alternate names.
- [ ] Sections use structured blocks, not raw HTML.
- [ ] Dosages include references.
- [ ] Warnings and interactions include severity.
- [ ] Species and regulatory context are explicit for clinical evidence.
- [ ] Reviewer identity and review date are present for reviewed clinical content.
- [ ] Derived letter and search files were regenerated, not manually edited.
- [ ] Data validation passed.

## Translation PR Checklist

- [ ] New locale has `manifest.json`.
- [ ] New locale has `ui.json`.
- [ ] New locale has `alphabet.json`.
- [ ] Letter files follow the same structure.
- [ ] Slugs and IDs are consistent with the base locale or document the difference.
- [ ] Search finds primary names, trade names, and synonyms.
