export interface DelimitedTable {
  headers: string[]
  rows: string[][]
}

export class DelimitedTextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DelimitedTextError'
  }
}

export function detectDelimitedTextDelimiter(
  input: string,
  candidates: readonly string[] = [',', ';', '\t'],
): string {
  const counts = new Map(candidates.map((candidate) => [candidate, 0]))
  let inQuotedField = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]

    if (character === '"') {
      if (inQuotedField && input[index + 1] === '"') {
        index += 1
      } else {
        inQuotedField = !inQuotedField
      }

      continue
    }

    if (!inQuotedField && (character === '\r' || character === '\n')) {
      break
    }

    if (!inQuotedField && counts.has(character)) {
      counts.set(character, counts.get(character)! + 1)
    }
  }

  const rankedCandidates = [...counts.entries()].sort(
    (left, right) => right[1] - left[1],
  )
  const [bestCandidate, bestCount] = rankedCandidates[0]
  const secondCount = rankedCandidates[1]?.[1] ?? 0

  if (bestCount === 0) {
    throw new DelimitedTextError(
      'Could not detect a delimiter from the header row.',
    )
  }

  if (bestCount === secondCount) {
    throw new DelimitedTextError(
      'Delimiter detection is ambiguous; pass --delimiter explicitly.',
    )
  }

  return bestCandidate
}

function isEmptyTrailingRow(row: string[]): boolean {
  return row.length === 1 && row[0] === ''
}

export function parseDelimitedText(
  input: string,
  delimiter = ';',
): DelimitedTable {
  if (delimiter.length !== 1 || delimiter === '"' || /[\r\n]/.test(delimiter)) {
    throw new DelimitedTextError('Delimiter must be one non-quote, non-newline character.')
  }

  const text = input.replace(/^\uFEFF/, '')
  const parsedRows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotedField = false
  let justClosedQuotedField = false

  const finishField = () => {
    row.push(field)
    field = ''
    justClosedQuotedField = false
  }

  const finishRow = () => {
    finishField()
    parsedRows.push(row)
    row = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inQuotedField) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotedField = false
          justClosedQuotedField = true
        }
      } else {
        field += character
      }

      continue
    }

    if (justClosedQuotedField && character !== delimiter && character !== '\r' && character !== '\n') {
      throw new DelimitedTextError(
        `Unexpected character after a closing quote at character ${index + 1}.`,
      )
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new DelimitedTextError(
          `Unexpected quote inside an unquoted field at character ${index + 1}.`,
        )
      }

      inQuotedField = true
      continue
    }

    if (character === delimiter) {
      finishField()
      continue
    }

    if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1
      }

      finishRow()
      continue
    }

    field += character
  }

  if (inQuotedField) {
    throw new DelimitedTextError('The input ends inside a quoted field.')
  }

  if (field.length > 0 || row.length > 0 || justClosedQuotedField) {
    finishRow()
  }

  if (parsedRows.length > 0 && isEmptyTrailingRow(parsedRows.at(-1)!)) {
    parsedRows.pop()
  }

  if (parsedRows.length === 0) {
    throw new DelimitedTextError('The input does not contain a header row.')
  }

  const [headers, ...rows] = parsedRows
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  )

  if (headers.some((header) => header.trim() === '')) {
    throw new DelimitedTextError('Header names must not be empty.')
  }

  if (duplicateHeaders.length > 0) {
    throw new DelimitedTextError(
      `Header names must be unique. Duplicate: ${duplicateHeaders[0]}.`,
    )
  }

  rows.forEach((currentRow, index) => {
    if (currentRow.length !== headers.length) {
      throw new DelimitedTextError(
        `Row ${index + 2} has ${currentRow.length} fields; expected ${headers.length}.`,
      )
    }
  })

  return { headers, rows }
}
