import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIBRARY_PREFERENCES,
  normalizeLibraryPreferences,
  resolveLibraryTheme,
} from './libraryPreferences'

describe('libraryPreferences', () => {
  it('normalizes invalid persisted preferences', () => {
    expect(
      normalizeLibraryPreferences({
        theme: 'purple' as never,
        density: 'huge' as never,
        wheelPageTurn: 'yes' as never,
      }),
    ).toEqual(DEFAULT_LIBRARY_PREFERENCES)
  })

  it('keeps valid persisted preferences', () => {
    expect(
      normalizeLibraryPreferences({
        theme: 'light',
        density: 'compact',
        wheelPageTurn: false,
      }),
    ).toEqual({
      theme: 'light',
      density: 'compact',
      wheelPageTurn: false,
    })
  })

  it('resolves system theme from the current color preference', () => {
    expect(resolveLibraryTheme('system', true)).toBe('light')
    expect(resolveLibraryTheme('system', false)).toBe('dark')
    expect(resolveLibraryTheme('light', false)).toBe('light')
    expect(resolveLibraryTheme('dark', true)).toBe('dark')
  })
})
