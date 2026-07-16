import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

import type { DrugConcept, ProductCatalogManifest } from '../src/types/drugbook.ts'
import {
  buildMapaProductCatalog,
  parseComponentMappingRegistry,
  parseMapaPharmaceuticalCandidateDataset,
} from './lib/mapaProductCatalogBuilder.ts'

interface CommandArguments {
  dataVersion: string
  inputPath: string
  locale: string
  mappingsPath: string
  publicRootPath: string
  updatedAt: string
}

function readOption(argumentsList: string[], option: string): string | null {
  const optionIndex = argumentsList.indexOf(option)

  if (optionIndex === -1) {
    return null
  }

  const value = argumentsList[optionIndex + 1]

  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`)
  }

  return value
}

function requireOption(argumentsList: string[], option: string): string {
  const value = readOption(argumentsList, option)

  if (!value) {
    throw new Error(`${option} is required.`)
  }

  return value
}

function parseArguments(argumentsList: string[]): CommandArguments {
  return {
    dataVersion: requireOption(argumentsList, '--data-version'),
    inputPath: resolve(requireOption(argumentsList, '--input')),
    locale: requireOption(argumentsList, '--locale'),
    mappingsPath: resolve(requireOption(argumentsList, '--mappings')),
    publicRootPath: resolve(requireOption(argumentsList, '--public-root')),
    updatedAt: requireOption(argumentsList, '--updated-at'),
  }
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8')) as unknown
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function loadConcepts(publicRootPath: string): DrugConcept[] {
  const conceptsPath = resolve(publicRootPath, 'catalog', 'concepts')
  const concepts: DrugConcept[] = []

  for (const fileName of readdirSync(conceptsPath).sort()) {
    if (!fileName.endsWith('.json')) {
      continue
    }

    const filePath = resolve(conceptsPath, fileName)
    const candidate = readJson(filePath)

    if (
      typeof candidate !== 'object'
      || candidate === null
      || !('items' in candidate)
      || !Array.isArray(candidate.items)
    ) {
      throw new Error(`Invalid concept shard ${fileName}: missing items array.`)
    }

    for (const [index, item] of candidate.items.entries()) {
      if (
        typeof item !== 'object'
        || item === null
        || !('id' in item)
        || typeof item.id !== 'string'
        || !('conceptType' in item)
        || (item.conceptType !== 'ingredient' && item.conceptType !== 'combination')
      ) {
        throw new Error(`Invalid concept at ${fileName} items[${index}].`)
      }

      if (
        item.conceptType === 'combination'
        && (
          !('ingredientIds' in item)
          || !Array.isArray(item.ingredientIds)
          || item.ingredientIds.some(
            (ingredientId: unknown) => typeof ingredientId !== 'string',
          )
        )
      ) {
        throw new Error(
          `Invalid combination ingredient IDs at ${fileName} items[${index}].`,
        )
      }

      concepts.push(item as DrugConcept)
    }
  }

  return concepts
}

function previousGeneratedShardIds(manifestPath: string): string[] {
  if (!existsSync(manifestPath)) {
    return []
  }

  const manifest = readJson(manifestPath) as Partial<ProductCatalogManifest>

  if (!Array.isArray(manifest.shards)) {
    return []
  }

  return manifest.shards
    .map((shard) => shard?.id)
    .filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]+$/.test(id))
}

try {
  const commandArguments = parseArguments(process.argv.slice(2))
  const dataset = parseMapaPharmaceuticalCandidateDataset(
    readJson(commandArguments.inputPath),
  )
  const mappings = parseComponentMappingRegistry(
    readJson(commandArguments.mappingsPath),
  )
  const concepts = loadConcepts(commandArguments.publicRootPath)
  const result = buildMapaProductCatalog(dataset, {
    locale: commandArguments.locale,
    dataVersion: commandArguments.dataVersion,
    updatedAt: commandArguments.updatedAt,
    concepts,
    mappings,
  })
  const productsPath = resolve(
    commandArguments.publicRootPath,
    'catalog',
    'products',
  )
  const manifestPath = resolve(productsPath, 'manifest.json')
  const nextShardIds = new Set(result.shards.map((shard) => shard.letter))

  for (const oldShardId of previousGeneratedShardIds(manifestPath)) {
    if (nextShardIds.has(oldShardId)) {
      continue
    }

    const oldShardPath = resolve(productsPath, `${basename(oldShardId)}.json`)

    if (existsSync(oldShardPath)) {
      unlinkSync(oldShardPath)
    }
  }

  for (const shard of result.shards) {
    writeJson(resolve(productsPath, `${shard.letter}.json`), shard)
  }

  writeJson(manifestPath, result.manifest)
  writeJson(
    resolve(commandArguments.publicRootPath, 'product-search-index.json'),
    result.searchIndex,
  )
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`MAPA product catalog build failed: ${message}\n`)
  process.exitCode = 1
}
