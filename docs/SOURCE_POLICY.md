# Data Source and Licensing Policy

This policy defines which sources can feed Sala Vet Drugbook and what kind of information each source can support. A source being free to read does not automatically make its content safe to crawl, copy, translate, or redistribute.

Policy reviewed: 2026-07-16.

## Core Rules

- Use model knowledge only to suggest search terms, aliases, or candidate mappings. Never publish it as clinical evidence.
- Prefer official downloadable datasets and documented APIs over page scraping.
- Preserve source, jurisdiction, upstream identifier, retrieval date, and content hash for imported records.
- Write clinical summaries in original wording and cite the supporting references.
- Do not reproduce long passages, tables, images, or monographs unless the license explicitly permits it.
- Record regulatory status per jurisdiction. Approval in the United States or European Union is not approval in Brazil.
- Treat on-label and off-label use as explicit, jurisdiction-specific facts.
- Require veterinary review for dosage, contraindication, interaction, withdrawal, pregnancy/lactation, and organ-adjustment content.

## Source Tiers

### Tier 1 - Brazilian Regulatory Inventory

#### MAPA Veterinary Product Inventory

- Product-panel index: https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/produtos-veterinarios/paineis-de-bi-do-mapa
- Pharmaceutical panel: https://mapa-indicadores.agricultura.gov.br/publico/extensions/Produtos_Farmaceuticos/Produtos_Farmaceuticos.html
- Biological panel: https://mapa-indicadores.agricultura.gov.br/publico/extensions/Produtos_Biologicos/Produtos_Biologicos.html
- SIPEAGRO dataset: https://dados.agricultura.gov.br/dataset/sipeagro
- Publisher: Ministry of Agriculture and Livestock of Brazil (MAPA).
- Intended use: the audited MAPA exports are the approved primary inventory of Brazilian veterinary commercial products and registrations.

The 2026-07-16 audit found that the SIPEAGRO resource named `Produto Veterinário` contains establishment registrations and activities, not product records. Its declared Creative Commons Attribution license applies to that open-data dataset, but the file cannot support commercial-product ingestion. See [the source audit](SOURCE_AUDIT.md) for the hash, row counts, exact fields, and decision.

The product panels expose product-level table exports. Their pharmaceutical and biological schemas were audited on 2026-07-16. On the same date, the project operator explicitly confirmed that all source content supplied under `.data/` is authorized for free redistribution and transformation for this free veterinary drugbook. This project-specific approval resolves the ingestion and derived-data publication decision. The registry records that decision in plain language instead of assigning an unsupported SPDX or Creative Commons identifier to the Qlik exports.

The first pharmaceutical adapter may inspect product identity, regulatory status, holder, source active-ingredient names, form, route, and species fields. It ignores `Modo de Uso`, `Advertência`, and `Indicação` in its initial inventory output for clinical-safety and editorial-scope reasons, not because reuse is prohibited. A later adapter may preserve and transform these fields as attributed regulatory content, but it must keep them visibly unreviewed until the veterinary editorial workflow approves them. The biological export is not mapped into chemical ingredient concepts because vaccines, diagnostic kits, antigens, organisms, and diluents require a separate data model.

Every input must pass fail-closed schema inspection. Missing ingredient, formulation, strength, route, species, or status data remains missing until an allowed source supplies it. Trade names alone are not sufficient evidence for component mapping. Attribution must be present in project documentation and in the application's data-source view.

### Tier 2 - Foreign Regulatory Cross-Checks and Labels

These sources help normalize names, identify possible combinations, discover official labels, and cross-check clinical research. Every imported record retains its foreign jurisdiction.

#### FDA Animal Drugs @ FDA and Green Book

- Explanation: https://www.fda.gov/animal-veterinary/approved-animal-drug-products-green-book/animal-drugs-fda-explained
- Search and reports: https://animaldrugsatfda.fda.gov/adafda/views/search.html
- Intended use: United States proprietary names, active ingredients, applications, approved species/uses, supporting document links, and cross-checks.

The Green Book is updated regularly and provides reports organized by trade name and active ingredient. It does not establish Brazilian registration and does not cover every legally marketed United States animal drug category.

#### DailyMed Animal Structured Product Labels

- Downloads: https://dailymed.nlm.nih.gov/dailymed/spl-resources-all-drug-labels.cfm
- Intended use: structured United States label discovery and source linking.

DailyMed provides a dedicated animal-label release. Before redistributing label text or assets, perform a content-specific rights check. Initial automation should extract identifiers and factual fields, keep quotations minimal, and link to the official label.

#### EMA Union Product Database

- Overview: https://www.ema.europa.eu/en/veterinary-regulatory-overview/veterinary-medicinal-products-regulation/union-product-database
- Intended use: European Union/European Economic Area product and substance cross-checks, availability, and official product information links.

Public data is searchable, while machine-to-machine API access may require registration and must follow the current access policy and technical terms. Do not build an automated importer until access and reuse conditions are documented.

### Tier 3 - Clinical Evidence Discovery

Examples include PubMed, AGRICOLA, open-access journal articles, public consensus guidelines, and official regulatory assessment documents.

- Bibliographic databases support discovery and citation.
- Each article, guideline, or book chapter has its own license and evidence quality.
- Abstract availability is not permission to reproduce an article.
- Prefer direct primary research, current consensus guidance, or official labels for high-risk claims.
- Record DOI, PMID, edition/version, publication date, and access date when available.

### Tier 4 - Proprietary or Subscription Clinical References

Examples include Plumb's, Vetlexicon, BSAVA resources, VIN, CABI/VetMed Resource, and other commercial handbooks or databases.

- Do not crawl, bulk-extract, or republish this content without an explicit license agreement.
- A paid subscription or institutional login does not grant redistribution rights.
- If an editor consults a proprietary reference, the public contribution still needs an original summary, a valid citation, and a documented rights decision.
- Proprietary sources should not be the only traceable support for calculator-critical data unless the project has a durable access and citation policy.

## Discovery Guides Are Not Data Licenses

Library guides, including the LSU free veterinary databases guide, are useful for finding candidate resources:

- https://guides.lib.lsu.edu/clinicaldatabasesandresources/freevetdatabases

The guide itself is not evidence that every linked database permits automated collection or redistribution. Each linked source must pass this policy independently.

## Allowed Automated Uses

Automation may:

- download a source that explicitly offers a bulk file or documented API;
- import factual product metadata covered by a compatible license;
- normalize casing, whitespace, accents, identifiers, and reviewed aliases deterministically;
- propose component mappings as candidates;
- generate indexes, relationship lists, validation reports, and draft pull requests;
- detect upstream additions, changes, and removals.

Automation may not:

- infer a clinically meaningful component relationship from a brand name alone;
- convert model output into reviewed clinical content;
- mark a dosage or warning as reviewed;
- bypass authentication, rate limits, robots controls, or source terms;
- copy proprietary monographs into the repository;
- merge generated changes directly into the default branch.

## Clinical Publication Requirements

Every user-facing clinical statement includes or inherits:

- one or more reference IDs;
- the applicable species;
- jurisdiction and on-label/off-label/unknown status when relevant;
- editorial status;
- reviewer identity;
- review date and planned re-review date.

High-risk statements require a direct supporting source. Conflicting sources are preserved and summarized rather than silently collapsed.

Unreviewed product metadata can appear in the catalog with a clear incomplete status. Unreviewed clinical dosage, contraindication, interaction, withdrawal, pregnancy/lactation, and organ-adjustment instructions are not presented as reviewed guidance.

## Source Change and Retraction Handling

- Every sync produces a report of added, changed, missing, and unresolved records.
- A missing upstream product is marked for review before being retired locally.
- Source corrections never rewrite Git history; they arrive through a new pull request.
- Retracted literature or withdrawn regulatory information creates a high-priority editorial issue.
- Cached PWA data retains its source and review dates and must not claim to be current while offline.
