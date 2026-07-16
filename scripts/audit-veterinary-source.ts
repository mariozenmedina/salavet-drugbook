import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

import { auditVeterinaryProductSource } from './lib/veterinarySourceAudit.ts'

interface CommandArguments {
  delimiter: string | undefined
  inputPath: string
  reportPath: string | null
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

function parseArguments(argumentsList: string[]): CommandArguments {
  const inputPath = readOption(argumentsList, '--input')

  if (!inputPath) {
    throw new Error(
      'Usage: pnpm source:audit -- --input <file> [--report <file>] [--delimiter <character>]',
    )
  }

  return {
    delimiter: readOption(argumentsList, '--delimiter') ?? undefined,
    inputPath: resolve(inputPath),
    reportPath: readOption(argumentsList, '--report'),
  }
}

try {
  const commandArguments = parseArguments(process.argv.slice(2))
  const bytes = readFileSync(commandArguments.inputPath)
  const report = auditVeterinaryProductSource(
    bytes,
    basename(commandArguments.inputPath),
    commandArguments.delimiter,
  )
  const serializedReport = `${JSON.stringify(report, null, 2)}\n`

  if (commandArguments.reportPath) {
    const reportPath = resolve(commandArguments.reportPath)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, serializedReport, 'utf8')
  }

  process.stdout.write(serializedReport)

  if (!report.classification.canProceedToProductMapping) {
    process.exitCode = 2
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Source audit failed: ${message}\n`)
  process.exitCode = 1
}
