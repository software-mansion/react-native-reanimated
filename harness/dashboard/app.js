const state = {
  tests: [],
  results: new Map(),
  selectedId: null,
  platform: 'all',
  search: '',
  runIndex: 0,
  frameIndex: 0,
  selectedTag: null,
  timer: null,
  buildOutput: '',
};

const elements = Object.fromEntries([
  'build', 'build-path', 'empty', 'failed-count', 'frame-info', 'frame-label', 'frame-number', 'frame-total',
  'mode-tabs', 'mutations', 'next-frame', 'node-info', 'output', 'passed-count', 'pending-count', 'play',
  'previous-frame', 'run-all', 'run-one', 'run-status', 'search', 'stage', 'test-detail', 'test-list',
  'test-meta', 'test-name', 'test-suite', 'timeline', 'total-count', 'view-count', 'view-list',
].map((id) => [id, document.getElementById(id)]));

elements.search.addEventListener('input', (event) => {
  state.search = event.target.value.toLowerCase();
  renderList();
});
elements['run-all'].addEventListener('click', () => runTests(state.tests.map((test) => test.id)));
elements['run-one'].addEventListener('click', () => state.selectedId && runTests([state.selectedId]));
elements.build.addEventListener('click', build);
elements.timeline.addEventListener('input', (event) => {
  stopPlayback();
  state.frameIndex = Number(event.target.value);
  renderReplay();
});
elements['frame-number'].addEventListener('change', (event) => {
  const frames = currentFrames();
  if (frames.length === 0) {
    return;
  }
  stopPlayback();
  const index = Math.trunc(Number(event.target.value)) - 1;
  state.frameIndex = Number.isFinite(index) ? Math.min(frames.length - 1, Math.max(0, index)) : state.frameIndex;
  renderReplay();
});
elements['previous-frame'].addEventListener('click', () => stepFrame(-1));
elements['next-frame'].addEventListener('click', () => stepFrame(1));
elements.play.addEventListener('click', togglePlayback);
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  state.platform = button.dataset.platform;
  document.querySelectorAll('.filter').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
  renderList();
}));
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.target.closest('button, input, summary')) {
    return;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepFrame(event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === ' ') {
    event.preventDefault();
    togglePlayback();
  }
});

loadTests();

async function loadTests() {
  const response = await fetch('/api/tests');
  const payload = await response.json();
  state.tests = payload.tests;
  elements['build-path'].textContent = payload.buildDirectory;
  render();
}

async function build() {
  setBusy(true, 'Building native targets…');
  try {
    const response = await fetch('/api/build', { method: 'POST' });
    const payload = await response.json();
    state.tests = payload.tests ?? state.tests;
    state.buildOutput = payload.output ?? '';
    if (payload.passed) {
      state.results.clear();
      state.runIndex = 0;
      state.frameIndex = 0;
      state.selectedTag = null;
    }
    elements['run-status'].textContent = payload.passed ? 'Build passed' : 'Build failed';
    render();
  } finally {
    setBusy(false);
  }
}

async function runTests(ids) {
  stopPlayback();
  setBusy(true, ids.length === 1 ? 'Running test…' : `Running ${ids.length} tests…`);
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tests: ids }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'Test run failed');
    }
    for (const result of payload.results) {
      state.results.set(result.id, result);
    }
    if (ids.length === 1) {
      state.selectedId = ids[0];
      state.runIndex = 0;
      state.frameIndex = 0;
      state.selectedTag = null;
    }
    elements['run-status'].textContent = `${payload.results.filter((result) => result.passed).length}/${payload.results.length} passed`;
    render();
  } catch (error) {
    elements['run-status'].textContent = error.message;
  } finally {
    setBusy(false);
  }
}

function setBusy(busy, message) {
  elements.build.disabled = busy;
  elements['run-all'].disabled = busy;
  elements['run-one'].disabled = busy;
  if (message) {
    elements['run-status'].textContent = message;
  }
}

function render() {
  const passed = [...state.results.values()].filter((result) => result.passed).length;
  const failed = [...state.results.values()].filter((result) => !result.passed).length;
  elements['total-count'].textContent = state.tests.length;
  elements['passed-count'].textContent = passed;
  elements['failed-count'].textContent = failed;
  elements['pending-count'].textContent = state.tests.length - state.results.size;
  renderList();
  renderDetail();
}

function renderList() {
  const visible = state.tests.filter((test) => {
    const result = state.results.get(test.id);
    const platformMatches = state.platform === 'all' || test.platform === state.platform ||
        (state.platform === 'failed' && result && !result.passed);
    return platformMatches && test.id.toLowerCase().includes(state.search);
  });

  elements['test-list'].replaceChildren();
  let previousSuite = '';
  for (const test of visible) {
    if (test.suite !== previousSuite) {
      const label = document.createElement('div');
      label.className = 'suite-label';
      label.textContent = test.suite.replaceAll(/([a-z])([A-Z])/g, '$1 $2');
      elements['test-list'].append(label);
      previousSuite = test.suite;
    }
    const result = state.results.get(test.id);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `test-row${test.id === state.selectedId ? ' selected' : ''}`;
    row.innerHTML = `<span class="result-dot ${result ? (result.passed ? 'passed' : 'failed') : ''}"></span>`;
    const name = document.createElement('span');
    name.textContent = test.name;
    const platform = document.createElement('span');
    platform.className = 'platform';
    platform.textContent = test.platform;
    row.append(name, platform);
    row.addEventListener('click', () => selectTest(test.id));
    elements['test-list'].append(row);
  }
}

function selectTest(id) {
  stopPlayback();
  state.selectedId = id;
  state.runIndex = 0;
  state.frameIndex = 0;
  state.selectedTag = null;
  render();
}

function renderDetail() {
  const test = state.tests.find((candidate) => candidate.id === state.selectedId);
  elements.empty.classList.toggle('hidden', Boolean(test));
  elements['test-detail'].classList.toggle('hidden', !test);
  if (!test) {
    return;
  }

  const result = state.results.get(test.id);
  elements['test-suite'].textContent = `${test.platform} · ${test.suite}`;
  elements['test-name'].textContent = test.name;
  elements['test-meta'].replaceChildren(
      chip(result ? (result.passed ? 'Passed' : 'Failed') : 'Not run', result ? (result.passed ? 'passed' : 'failed') : ''),
      chip(result ? `${result.duration} ms` : 'No result'));
  elements.output.textContent = result?.output || state.buildOutput ||
      'Run the test to capture native output and mounted frames.';
  renderModeTabs(result);
  renderReplay();
}

function renderModeTabs(result) {
  elements['mode-tabs'].replaceChildren();
  const runs = result?.runs ?? [];
  runs.forEach((run, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mode-tab${index === state.runIndex ? ' active' : ''}`;
    button.textContent = `${run.mode} · ${run.frames.length} frames`;
    button.addEventListener('click', () => {
      state.runIndex = index;
      state.frameIndex = 0;
      stopPlayback();
      renderDetail();
    });
    elements['mode-tabs'].append(button);
  });
}

function renderReplay() {
  const result = state.results.get(state.selectedId);
  const run = result?.runs?.[state.runIndex];
  const frames = run?.frames ?? [];
  state.frameIndex = Math.min(state.frameIndex, Math.max(0, frames.length - 1));
  elements.timeline.max = Math.max(0, frames.length - 1);
  elements.timeline.value = state.frameIndex;
  elements.timeline.disabled = frames.length < 2;
  elements['frame-number'].max = Math.max(1, frames.length);
  elements['frame-number'].value = frames.length ? state.frameIndex + 1 : 0;
  elements['frame-number'].disabled = frames.length === 0;
  elements['frame-total'].textContent = `/ ${frames.length}`;
  elements['previous-frame'].disabled = frames.length < 2;
  elements['next-frame'].disabled = frames.length < 2;
  elements.play.disabled = frames.length < 2;
  elements.stage.replaceChildren();

  if (frames.length === 0) {
    elements['frame-label'].textContent = 'No trace';
    elements.stage.innerHTML = '<div class="no-trace">Run this scenario to capture its mounted host tree.</div>';
    renderDefinitionList(elements['frame-info'], [['State', 'No captured frames']]);
    renderDefinitionList(elements['node-info'], [['Tip', 'Click a mounted view']]);
    elements['view-count'].textContent = '0 views';
    elements['view-list'].replaceChildren();
    elements.mutations.replaceChildren();
    return;
  }

  const frame = frames[state.frameIndex];
  const selectedNode = state.selectedTag === null ? null : findNode(frame.root, state.selectedTag);
  elements['frame-label'].textContent = `${frame.time} ms · transaction #${frame.transaction}`;
  renderDefinitionList(elements['frame-info'], [
    ['Virtual time', `${frame.time} ms`],
    ['Transaction', `#${frame.transaction}`],
    ['Host views', String(countNodes(frame.root) - 1)],
  ]);
  renderDefinitionList(
      elements['node-info'],
      selectedNode ? nodeRows(selectedNode) : state.selectedTag === null ?
          [['Tip', 'Select a view on the canvas or in the hierarchy']] :
          [['Tag', `#${state.selectedTag}`], ['State', 'Not mounted in this frame']]);
  renderMutations(frame.mutations);
  renderStage(frame.root);
  renderViewList(frame.root);
}

function renderStage(root) {
  const width = Math.max(1, root.frame.width);
  const height = Math.max(1, root.frame.height);
  elements.stage.style.aspectRatio = `${width} / ${height}`;
  for (const child of root.children) {
    appendStageNode(child, root.frame, 1, root.frame);
  }
}

function appendStageNode(node, parentFrame, parentOpacity, rootFrame) {
  const frame = {
    x: parentFrame.x + node.frame.x,
    y: parentFrame.y + node.frame.y,
    width: node.frame.width,
    height: node.frame.height,
  };
  const opacity = parentOpacity * node.opacity;
  elements.stage.append(nodeElement(node, frame, opacity, rootFrame));
  for (const child of node.children) {
    appendStageNode(child, frame, opacity, rootFrame);
  }
}

function nodeElement(node, frame, opacity, rootFrame) {
  const element = document.createElement('div');
  const selected = state.selectedTag === node.tag;
  element.className = `mounted-node${node.tag >= 10_000_000 ? ' synthetic' : ''}${selected ? ' selected' : ''}`;
  element.role = 'button';
  element.tabIndex = 0;
  element.dataset.nodeTag = node.tag;
  element.ariaLabel = `View ${node.tag}, ${node.component}`;
  element.ariaPressed = String(selected);
  element.style.left = percent(frame.x - rootFrame.x, rootFrame.width);
  element.style.top = percent(frame.y - rootFrame.y, rootFrame.height);
  element.style.width = percent(frame.width, rootFrame.width);
  element.style.height = percent(frame.height, rootFrame.height);
  element.style.opacity = opacity;
  element.style.zIndex = node.zIndex;
  element.style.background = colorForTag(node.tag);
  element.title = `#${node.tag} ${node.component}`;
  const select = (event) => {
    event.stopPropagation();
    selectNode(node.tag, 'stage');
  };
  element.addEventListener('click', select);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(event);
    }
  });
  const label = document.createElement('span');
  label.className = 'node-label';
  label.textContent = `#${node.tag}`;
  element.append(label);
  return element;
}

function renderViewList(root) {
  const scrollTop = elements['view-list'].scrollTop;
  const entries = root.children.flatMap((node) => flattenNodes(node));
  elements['view-count'].textContent = `${entries.length} ${entries.length === 1 ? 'view' : 'views'}`;
  elements['view-list'].replaceChildren(...entries.map(({ node, depth }) => {
    const entry = document.createElement('div');
    entry.className = 'view-entry';
    entry.role = 'listitem';
    const button = document.createElement('button');
    button.type = 'button';
    const selected = state.selectedTag === node.tag;
    button.className = `view-row${selected ? ' selected' : ''}`;
    button.dataset.viewTag = node.tag;
    button.style.setProperty('--depth', depth);
    button.ariaLabel = `${node.component} view ${node.tag}, hierarchy level ${depth + 1}`;
    button.ariaPressed = String(selected);
    button.title = `${node.component} #${node.tag}`;

    const branch = document.createElement('span');
    branch.className = 'view-branch';
    branch.textContent = node.children.length ? '⌄' : '·';
    const swatch = document.createElement('span');
    swatch.className = 'view-swatch';
    swatch.style.background = colorForTag(node.tag);
    const component = document.createElement('span');
    component.className = 'view-component';
    component.textContent = node.component;
    const tag = document.createElement('span');
    tag.className = 'view-tag';
    tag.textContent = `#${node.tag}`;
    button.append(branch, swatch, component, tag);
    button.addEventListener('click', () => selectNode(node.tag, 'view-list'));
    button.addEventListener('keydown', navigateViewList);
    entry.append(button);
    return entry;
  }));
  elements['view-list'].scrollTop = scrollTop;
}

function flattenNodes(node, depth = 0) {
  return [
    { node, depth },
    ...node.children.flatMap((child) => flattenNodes(child, depth + 1)),
  ];
}

function navigateViewList(event) {
  const rows = [...elements['view-list'].querySelectorAll('.view-row')];
  const index = rows.indexOf(event.currentTarget);
  const target = event.key === 'ArrowDown' ? rows[index + 1] :
      event.key === 'ArrowUp' ? rows[index - 1] :
      event.key === 'Home' ? rows[0] :
      event.key === 'End' ? rows.at(-1) : null;
  if (target) {
    event.preventDefault();
    target.focus();
  }
}

function selectNode(tag, surface) {
  state.selectedTag = tag;
  renderReplay();
  const selector = surface === 'stage' ? `[data-node-tag="${tag}"]` : `[data-view-tag="${tag}"]`;
  const selected = elements[surface].querySelector(selector);
  selected?.focus({ preventScroll: surface === 'stage' });
  const treeRow = elements['view-list'].querySelector(`[data-view-tag="${tag}"]`);
  treeRow?.scrollIntoView({ block: 'nearest' });
}

function renderMutations(mutations) {
  elements.mutations.replaceChildren();
  if (mutations.length === 0) {
    elements.mutations.textContent = 'No host mutations';
    return;
  }
  for (const mutation of mutations) {
    const badge = document.createElement('span');
    badge.className = `mutation ${mutation.type}`;
    badge.textContent = `${mutation.type} #${mutation.tag}`;
    badge.title = `parent #${mutation.parentTag}, index ${mutation.index}`;
    elements.mutations.append(badge);
  }
}

function nodeRows(node) {
  return [
    ['Tag', `#${node.tag}`],
    ['Component', node.component],
    ['Origin', `${format(node.frame.x)}, ${format(node.frame.y)}`],
    ['Size', `${format(node.frame.width)} × ${format(node.frame.height)}`],
    ['Opacity', format(node.opacity)],
    ['Z-index', String(node.zIndex)],
    ['Children', String(node.children.length)],
  ];
}

function renderDefinitionList(element, rows) {
  element.replaceChildren(...rows.map(([term, value]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    row.append(dt, dd);
    return row;
  }));
}

function chip(text, className = '') {
  const element = document.createElement('span');
  element.className = `status-chip ${className}`;
  element.textContent = text;
  return element;
}

function stepFrame(delta) {
  const frames = currentFrames();
  if (frames.length === 0) {
    return;
  }
  state.frameIndex = (state.frameIndex + delta + frames.length) % frames.length;
  renderReplay();
}

function togglePlayback() {
  if (state.timer) {
    stopPlayback();
    return;
  }
  const frames = currentFrames();
  if (frames.length < 2) {
    return;
  }
  elements.play.textContent = 'Pause';
  elements.play.ariaPressed = 'true';
  state.timer = setInterval(() => stepFrame(1), 550);
}

function stopPlayback() {
  clearInterval(state.timer);
  state.timer = null;
  elements.play.textContent = 'Play';
  elements.play.ariaPressed = 'false';
}

function currentFrames() {
  return state.results.get(state.selectedId)?.runs?.[state.runIndex]?.frames ?? [];
}

function percent(value, total) {
  return `${(100 * value / Math.max(1, total)).toFixed(4)}%`;
}

function format(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '');
}

function colorForTag(tag) {
  return `hsla(${(tag * 67) % 360} 72% 52% / 0.5)`;
}

function countNodes(node) {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

function findNode(node, tag) {
  if (node.tag === tag) {
    return node;
  }
  for (const child of node.children) {
    const match = findNode(child, tag);
    if (match) {
      return match;
    }
  }
  return null;
}
