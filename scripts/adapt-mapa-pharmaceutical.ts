import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

import { adaptMapaPharmaceuticalExport } from './lib/mapaPharmaceuticalAdapter.ts'

interface CommandArguments {
  delimiter: string | undefined
  inputPath: string
  outputPath: string
  reportPath: string
  retrievedAt: string
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

function isWithinDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = relative(directoryPath, filePath)
  return relativePath === ''
    || (
      !isAbsolute(relativePath)
      && !relativePath.startsWith(`..${sep}`)
      && relativePath !== '..'
    )
}

function assertIntermediateOutputPath(filePath: string): void {
  const publicDataPath = resolve('public', 'data')

  if (isWithinDirectory(filePath, publicDataPath)) {
    throw new Error(
      'The initial adapter only writes intermediate review artifacts outside public/data.',
    )
  }
}

function parseArguments(argumentsList: string[]): CommandArguments {
  const inputPath = resolve(requireOption(argumentsList, '--input'))
  const outputPath = resolve(requireOption(argumentsList, '--output'))
  const reportPath = resolve(requireOption(argumentsList, '--report'))

  if (outputPath === reportPath) {
    throw new Error('--output and --report must use different paths.')
  }

  assertIntermediateOutputPath(outputPath)
  assertIntermediateOutputPath(reportPath)

  return {
    delimiter: readOption(argumentsList, '--delimiter') ?? undefined,
    inputPath,
    outputPath,
    reportPath,
    retrievedAt: requireOption(argumentsList, '--retrieved-at'),
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

try {
  const commandArguments = parseArguments(process.argv.slice(2))
  const bytes = readFileSync(commandArguments.inputPath)
  const result = adaptMapaPharmaceuticalExport(
    bytes,
    basename(commandArguments.inputPath),
    commandArguments.retrievedAt,
    commandArguments.delimiter,
  )

  writeJson(commandArguments.outputPath, result.dataset)
  writeJson(commandArguments.reportPath, result.report)
  process.stdout.write(`${JSON.stringify(result.report.summary, null, 2)}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`MAPA pharmaceutical adaptation failed: ${message}\n`)
  process.exitCode = 1
}
