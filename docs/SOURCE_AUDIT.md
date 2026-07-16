# MAPA Veterinary Product Source Audit

This audit records whether the currently published MAPA resources can support a deterministic Brazilian veterinary product importer. It separates a source's title from the fields actually present in the downloaded bytes.

Audit date: 2026-07-16.

## SIPEAGRO Open-Data Resource

Official references:

- Dataset: https://dados.agricultura.gov.br/dataset/sipeagro
- Resource page: https://dados.agricultura.gov.br/dataset/sipeagro/resource/7ce5fac0-9c8f-4e14-82d9-6deab9b5e2e9
- Resource ID: `7ce5fac0-9c8f-4e14-82d9-6deab9b5e2e9`
- Published filename: `sipeagroprodutoveterinario.csv`
- Declared encoding: UTF-8
- Declared dataset update frequency: weekly
- Declared dataset license: Creative Commons Attribution

The audited resource was last modified upstream on 2026-07-03. The downloaded snapshot had:

- 10,732,274 bytes;
- SHA-256 `46dc266e5f76d4a7aab6138ca2659d7d992ae79898a09d5500ec34a2f9f33c9d`;
- 64,536 data rows;
- 25,008 distinct establishment registration numbers.

Despite the resource title and filename, every row describes an establishment relationship. The exact headers were:

```text
UNIDADE_DA_FEDERACAO
MUNICIPIO
NUMERO_REGISTRO_ESTABELECIMENTO
STATUS_DO_REGISTRO
CNPJ
RAZAO_SOCIAL
NOME_FANTASIA
AREA_ATUACAO
ATIVIDADE
CLASSIFICACAO
CARACTERISTICA_ADICIONAL
```

The snapshot contained 59,706 active, 4,667 cancelled, and 163 suspended rows. Its classifications were 43,946 pharmaceutical, 20,588 biological, and 2 biochemical establishment relationships.

It does not contain a product registration number, product trade name, active ingredient, composition, dosage form, route, or authorized species. It therefore cannot produce commercial product records and must not be treated as the drug catalog. It may later support establishment or registration-holder cross-checks.

## MAPA Product Panels

MAPA currently links separate public panels for pharmaceutical and biological veterinary products:

- Panel index: https://www.gov.br/agricultura/pt-br/assuntos/insumos-agropecuarios/insumos-pecuarios/produtos-veterinarios/paineis-de-bi-do-mapa
- Pharmaceutical products: https://mapa-indicadores.agricultura.gov.br/publico/extensions/Produtos_Farmaceuticos/Produtos_Farmaceuticos.html
- Biological products: https://mapa-indicadores.agricultura.gov.br/publico/extensions/Produtos_Biologicos/Produtos_Biologicos.html

The pharmaceutical panel exposes export controls for two Qlik table objects. Its public application identifier and object identifiers are visible in the panel's own JavaScript, but QIX WebSocket access from the automation environment returned HTTP 403 even with the anonymous session cookie issued by the server. The agent workflow does not use browser automation, so it did not click or test the panel interactively.

These panels are the current official product-level candidates, but they are not yet approved ingestion sources. Before publication, the project still needs:

1. one manual export from each product table placed under the ignored `.data/` directory;
2. an audit of the exact headers, row meanings, identifiers, duplicates, and missing values;
3. confirmation of the export's reuse and attribution terms;
4. a deterministic source adapter with a committed, fictitious fixture;
5. an import-quality report and human-reviewed generated-data PR.

## Local Intake Command

Raw source files stay in `.data/` and are never committed. Audit a local semicolon-delimited export with:

```bash
pnpm source:audit -- --input .data/source.csv --report .data/source-audit.json
```

The command reports the file name, byte count, SHA-256 hash, headers, row count, recognized product fields, and blocking reasons. It exits with code `2` when the input cannot proceed to product mapping.

The current SIPEAGRO file is classified as `sipeagro-establishment-catalog` and rejected. A product file is only classified as `product-catalog-candidate` when it has recognized trade-name, product-registration, and active-ingredient or composition columns. Candidate classification does not verify any ingredient relationship and does not authorize redistribution.

## Decision

Stage 3 remains open. The project will not build a commercial drug inventory from the mislabeled SIPEAGRO establishment export and will not guess product-to-ingredient links. The next source task starts after the MAPA panel exports are available in `.data/`; importer code and generated product data remain separate pull requests.
