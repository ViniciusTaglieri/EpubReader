import { describe, expect, it } from 'vitest'
import {
  resolveMenuPlacement,
  resolveSubmenuPlacement,
} from './floatingMenuPlacement'

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
})

describe('resolveSubmenuPlacement', () => {
  it('prefers opening to the right and downward', () => {
    expect(
      resolveSubmenuPlacement({
        anchorRect: rect(100, 100, 256, 240),
        submenuSize: { width: 256, height: 180 },
        viewportSize: { width: 1000, height: 800 },
      }),
    ).toEqual({ horizontal: 'right', vertical: 'down' })
  })

  it('opens to the left when the right side would overflow', () => {
    expect(
      resolveSubmenuPlacement({
        anchorRect: rect(760, 100, 256, 240),
        submenuSize: { width: 256, height: 180 },
        viewportSize: { width: 1024, height: 800 },
      }).horizontal,
    ).toBe('left')
  })

  it('opens upward when the downward side would overflow', () => {
    expect(
      resolveSubmenuPlacement({
        anchorRect: rect(100, 650, 256, 160),
        submenuSize: { width: 256, height: 220 },
        viewportSize: { width: 1024, height: 800 },
      }).vertical,
    ).toBe('up')
  })
})

describe('resolveMenuPlacement', () => {
  it('prefers opening downward and aligned to the right edge', () => {
    expect(
      resolveMenuPlacement({
        anchorRect: rect(500, 100, 32, 32),
        menuSize: { width: 256, height: 220 },
        viewportSize: { width: 1000, height: 800 },
      }),
    ).toEqual({ horizontal: 'right', vertical: 'down' })
  })

  it('opens upward when the downward side would overflow', () => {
    expect(
      resolveMenuPlacement({
        anchorRect: rect(500, 720, 32, 32),
        menuSize: { width: 256, height: 220 },
        viewportSize: { width: 1000, height: 800 },
      }).vertical,
    ).toBe('up')
  })

  it('aligns left when right alignment would overflow off the left edge', () => {
    expect(
      resolveMenuPlacement({
        anchorRect: rect(20, 100, 32, 32),
        menuSize: { width: 256, height: 220 },
        viewportSize: { width: 1000, height: 800 },
      }).horizontal,
    ).toBe('left')
  })
})
