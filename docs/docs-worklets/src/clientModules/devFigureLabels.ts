const LABEL_ATTRIBUTE = 'data-figure-label';

let observer: MutationObserver | null = null;
let scheduled = false;

export function onRouteDidUpdate() {
  if (typeof document === 'undefined') {
    return;
  }
  observer ??= new MutationObserver(scheduleLabels);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleLabels();
}

function scheduleLabels() {
  if (scheduled) {
    return;
  }
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    labelFigures();
  });
}

function labelFigures() {
  const figures = document.querySelectorAll<HTMLElement>(
    'article [data-figure]'
  );
  const prefix = pagePrefix(window.location.pathname);
  figures.forEach((figure, index) => {
    const text = `${prefix}-${index + 1} ${figure.dataset.figure}`;
    let label = figure.querySelector<HTMLElement>(
      `:scope > [${LABEL_ATTRIBUTE}]`
    );
    if (label === null) {
      label = createLabel();
      if (getComputedStyle(figure).position === 'static') {
        figure.style.position = 'relative';
      }
      figure.prepend(label);
    }
    if (label.textContent !== text) {
      label.textContent = text;
    }
  });
}

function pagePrefix(pathname: string) {
  const segment =
    pathname
      .split('/')
      .filter((part) => part.length > 0)
      .at(-1) ?? 'about';
  const name = ['docs', 'unreleased'].includes(segment) ? 'about' : segment;
  if (/[A-Z]/.test(name)) {
    return name;
  }
  const words = name.split(/[-_]/).filter((word) => word.length > 0);
  return (
    words.length > 1 ? words.map((word) => word[0]).join('') : name.slice(0, 3)
  ).toUpperCase();
}

function createLabel() {
  const label = document.createElement('span');
  label.setAttribute(LABEL_ATTRIBUTE, '');
  Object.assign(label.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '20',
    padding: '1px 6px',
    borderRadius: '0 0 4px 0',
    background: '#ffd84d',
    color: '#111',
    font: '600 11px/1.5 monospace',
    pointerEvents: 'none',
  });
  return label;
}
