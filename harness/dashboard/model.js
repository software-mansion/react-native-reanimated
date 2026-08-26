export function findNodeState(node, tag, parentFrame = { x: 0, y: 0 }, parentOpacity = 1) {
  const absoluteFrame = {
    x: parentFrame.x + node.frame.x,
    y: parentFrame.y + node.frame.y,
    width: node.frame.width,
    height: node.frame.height,
  };
  const effectiveOpacity = parentOpacity * node.opacity;
  if (node.tag === tag) {
    return { node, absoluteFrame, effectiveOpacity };
  }
  for (const child of node.children) {
    const match = findNodeState(child, tag, absoluteFrame, effectiveOpacity);
    if (match) {
      return match;
    }
  }
  return null;
}

export function nodeRows({ node, absoluteFrame, effectiveOpacity }) {
  return [
    ['Tag', `#${node.tag}`],
    ['Component', node.component],
    ['Local origin', `${format(node.frame.x)}, ${format(node.frame.y)}`],
    ['Absolute origin', `${format(absoluteFrame.x)}, ${format(absoluteFrame.y)}`],
    ['Size', `${format(node.frame.width)} × ${format(node.frame.height)}`],
    ['Local opacity', format(node.opacity)],
    ['Effective opacity', format(effectiveOpacity)],
    ['Display', node.display],
    ['Z-index', String(node.zIndex)],
    ['Children', String(node.children.length)],
  ];
}

export function mutationLabel(mutation) {
  const opacity = mutation.before && mutation.after && mutation.before.opacity !== mutation.after.opacity
      ? ` · α ${format(mutation.before.opacity)}→${format(mutation.after.opacity)}`
      : '';
  const geometry = mutation.before && mutation.after
      ? `; frame ${formatFrame(mutation.before.frame)} → ${formatFrame(mutation.after.frame)}`
      : '';
  return {
    text: `${mutation.type} #${mutation.tag}${opacity}`,
    title: `parent #${mutation.parentTag}, index ${mutation.index}${geometry}`,
  };
}

function format(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '');
}

function formatFrame(frame) {
  return `${format(frame.x)},${format(frame.y)} ${format(frame.width)}×${format(frame.height)}`;
}
