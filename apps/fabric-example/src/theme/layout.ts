export const flex = {
  absolute: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  fill: { bottom: 0, flex: 1, left: 0, right: 0, top: 0 },
  grow: { flexGrow: 1 },
  row: { flexDirection: 'row' },
  shrink: { flexShrink: 1 },
  wrap: { flexWrap: 'wrap' },
} as const;
