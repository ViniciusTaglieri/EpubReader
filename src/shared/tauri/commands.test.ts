import { describe, expect, it } from 'vitest'
import { errorMessage } from './commands'

describe('errorMessage', () => {
  it('maps known backend error codes to friendly text', () => {
    expect(
      errorMessage({ code: 'epub_zip_error', message: 'invalid zip' }),
    ).toBe(
      'Não foi possível abrir este EPUB. O arquivo pode estar corrompido ou protegido.',
    )
  })

  it('uses a safe fallback for unknown errors', () => {
    expect(errorMessage(new Error('C:\\secret\\db.sqlite'))).toBe(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
