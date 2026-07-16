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

The pharmaceutical panel exposes export controls for two Qlik table objects. Its public application identifier and object identifiers are visible in the panel's own JavaScript, but QIX WebSocket access from the automation environment returned HTTP 403 even with the anonymous session cookie issued by the server. The agent workflow does not use browser automation, so the operator exported the tables manually.

The panel-index page states that its site content uses Creative Commons Attribution-NoDerivatives 3.0 Unported. It does not explicitly clarify whether that notice authorizes normalized redistribution of the Qlik table exports. The broader MAPA open-data page describes open datasets as freely reusable, but these panel exports are not currently published as resources in the MAPA open-data catalog. Generated public catalog data therefore remains blocked on a source-specific reuse decision.

### Pharmaceutical Export

Local snapshot: `produtos_farma_mapa.csv`.

- 5,144,324 bytes;
- SHA-256 `380e18c8c3355fc196c3844ae6592400dd3bb5935d90701d615338a8386c6522`;
- 2,825 rows;
- 2,684 distinct product names;
- 2,654 distinct current product registration numbers;
- 2,575 active, 204 cancelled, and 46 suspended rows.

The exact headers were:

```text
Nome do Produto
Forma Farmacêutica
Apresentação do Produto
Registro do Produto
Situação do registro
DT Concessão Registro
DT Vencimento Registro
DT Renovação do Registro do Produto
Registro Anterior
DT Concessão do Registro Anterior
DT Validade do Registro Anterior do Produto
IFA´s
Insumos Homeopáticos
Característica Adicional
Classe Farmacêutica
Espécie Animal
Registro do Estabelecimento
Nome  do Estabelecimento
CPF/CNPJ
Classificação do estabelecimento
UF
Grupo Atividade
Validade do Produto
Via Administração
Modo de Uso
Advertência
Grupo Matéria Prima
Origem
Nome Fabricante
País de Produção
Importador
Endereço do Importador
Indicação
```

Important quality findings:

- 158 active rows have no current `Registro do Produto`; all 158 retain a `Registro Anterior` and require an explicit legacy-identifier rule.
- 382 rows have no `IFA´s`; 13 of those provide `Insumos Homeopáticos`, while 369 provide neither field.
- 13 current registration numbers occur twice. Some pairs differ in active-ingredient spelling or species and must enter a conflict queue rather than being silently collapsed.
- 122 product names occur in more than one row. Trade name is therefore not a unique product identifier.
- `IFA´s` uses commas between source components. Salt, hydrate, spelling, concentration, and active-moiety variants require reviewed mappings.
- `Modo de Uso`, `Advertência`, and `Indicação` contain long label-like text. The first inventory adapter must ignore these fields rather than turn them into clinical monographs.

### Biological Export

Local snapshot: `produtos_bio_mapa.csv`.

- 406,655 bytes;
- SHA-256 `8ecbeaf27fe82b0821ca8e71c3cdfa74713f943f2f96dfff86146519f51ba5e5`;
- 1,374 rows;
- 1,350 distinct product names;
- 1,366 distinct license numbers;
- 910 current, 454 cancelled, 9 expired, and 1 placeholder row.

The exact headers were:

```text
Denominação do Produto
Status da Licença
UF do titular
Classe do produto
Nº Licença
Estabelecimento titular do registro
Origem - Nacional ou Importado
Espécies
Insumos ativos
Indicação
```

The export contains 974 vaccines, 311 diagnostic kits, 41 diagnostic antigens, and smaller groups of sera, diluents, cellular therapies, immunomodulators, biopharmaceuticals, and probiotics. Five license numbers occur in duplicate groups containing 12 rows. Eleven rows lack active inputs; ten are diluent products and one is a placeholder row.

Biological inputs use semicolons between organisms or antigens and are not equivalent to the chemical active-ingredient concepts used by the current v1 schema. They must not be forced into ingredient or fixed-combination records. A separate biological-product modeling decision is required before publication.

## Local Intake Command

Raw source files stay in `.data/` and are never committed. Audit a local CSV export with:

```bash
pnpm source:audit -- --input .data/source.csv --report .data/source-audit.json
```

The command reports the file name, byte count, SHA-256 hash, headers, row count, recognized product fields, and blocking reasons. It exits with code `2` when the input cannot proceed to product mapping.

The command detects comma, semicolon, or tab delimiters from the header. The current SIPEAGRO file is classified as `sipeagro-establishment-catalog` and rejected. Both manual MAPA exports are classified as `product-catalog-candidate`. Candidate classification only confirms the minimum product-level schema; it does not verify any ingredient relationship and does not authorize redistribution.

## Decision

Stage 3 remains open. The project will not build a commercial drug inventory from the mislabeled SIPEAGRO establishment export and will not guess product-to-ingredient links.

The next source-adapter pull request should target the pharmaceutical export only, generate an intermediate import-quality report and review queues, use committed fictitious fixtures, and ignore long label-like fields. The biological export needs a separate schema decision. Importer code and generated product data remain separate pull requests, and no generated panel data may be published until reuse terms are approved.
