import { describe, expect, it } from 'vitest'

import { DelimitedTextError, parseDelimitedText } from './delimitedText.ts'

describe('parseDelimitedText', () => {
  it('parses delimiters, escaped quotes, and newlines inside quoted fields', () => {
    const result = parseDelimitedText(
      'NAME;NOTES\r\n"Example; Product";"First line\nSecond ""quoted"" line"\r\n',
    )

    expect(result).toEqual({
      headers: ['NAME', 'NOTES'],
      rows: [['Example; Product', 'First line\nSecond "quoted" line']],
    })
  })

  it('rejects rows with an inconsistent field count', () => {
    expect(() => parseDelimitedText('A;B\n1\n')).toThrow(
      new DelimitedTextError('Row 2 has 1 fields; expected 2.'),
    )
  })

  it('rejects an unterminated quoted field', () => {
    expect(() => parseDelimitedText('A;B\n1;"unfinished')).toThrow(
      new DelimitedTextError('The input ends inside a quoted field.'),
    )
  })
})
