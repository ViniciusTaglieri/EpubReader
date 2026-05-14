export type FloatingRect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export type FloatingSize = {
  width: number
  height: number
}

export type SubmenuPlacement = {
  horizontal: 'right' | 'left'
  vertical: 'down' | 'up'
}

export type MenuPlacement = {
  horizontal: 'right' | 'left'
  vertical: 'down' | 'up'
}

export function resolveSubmenuPlacement({
  anchorRect,
  submenuSize,
  viewportSize,
  gap = 8,
  margin = 16,
  verticalOffset = 48,
}: {
  anchorRect: FloatingRect
  submenuSize: FloatingSize
  viewportSize: FloatingSize
  gap?: number
  margin?: number
  verticalOffset?: number
}): SubmenuPlacement {
  const rightEdge = anchorRect.right + gap + submenuSize.width
  const downEdge = anchorRect.top + verticalOffset + submenuSize.height

  return {
    horizontal: rightEdge <= viewportSize.width - margin ? 'right' : 'left',
    vertical: downEdge <= viewportSize.height - margin ? 'down' : 'up',
  }
}

export function resolveMenuPlacement({
  anchorRect,
  menuSize,
  viewportSize,
  gap = 8,
  margin = 16,
}: {
  anchorRect: FloatingRect
  menuSize: FloatingSize
  viewportSize: FloatingSize
  gap?: number
  margin?: number
}): MenuPlacement {
  const rightAlignedLeftEdge = anchorRect.right - menuSize.width
  const downEdge = anchorRect.bottom + gap + menuSize.height

  return {
    horizontal: rightAlignedLeftEdge >= margin ? 'right' : 'left',
    vertical: downEdge <= viewportSize.height - margin ? 'down' : 'up',
  }
}
