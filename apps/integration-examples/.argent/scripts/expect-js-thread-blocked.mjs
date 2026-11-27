import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const MAX_READS = 4;

const execFileAsync = promisify(execFile);

const device = await findOnlyBootedDevice();
await tap(device, 'block-js-thread');
await expectSharedValueToChangeWhileReactStateStops(device);

async function findOnlyBootedDevice() {
  const { devices } = await callArgent('list-devices', {});
  const booted = devices.filter(isBooted);
  if (booted.length !== 1) {
    throw new Error(`Expected one booted device, found ${booted.length}`);
  }
  return booted[0].udid ?? booted[0].serial;
}

async function tap(udid, identifier) {
  const { roots } = await callArgent('ui-tree', { udid });
  const { frame } = findNode(roots, identifier);
  await callArgent('gesture-tap', {
    udid,
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  });
}

async function expectSharedValueToChangeWhileReactStateStops(udid) {
  let previous = await readCounters(udid);
  for (let read = 1; read < MAX_READS; read++) {
    const current = await readCounters(udid);
    if (current.reactState === previous.reactState) {
      if (current.sharedValue === previous.sharedValue) {
        throw new Error(
          `The shared value stays at ${current.sharedValue} while the JS thread is blocked`
        );
      }
      return;
    }
    previous = current;
  }
  throw new Error(
    `The React state does not stop in ${MAX_READS} reads after the JS thread is blocked`
  );
}

async function callArgent(tool, args) {
  const { stdout } = await execFileAsync('argent', [
    'run',
    tool,
    '--args',
    JSON.stringify(args),
    '--json',
  ]);
  return JSON.parse(stdout);
}

function isBooted({ platform, state }) {
  return (
    (platform === 'ios' && state === 'Booted') ||
    (platform === 'android' && state === 'device')
  );
}

function findNode(nodes, identifier) {
  const node = findNodeOrUndefined(nodes, identifier);
  if (node === undefined) {
    throw new Error(`No element has the id ${identifier}`);
  }
  return node;
}

async function readCounters(udid) {
  const { roots } = await callArgent('ui-tree', { udid });
  return {
    sharedValue: textOf(findNode(roots, 'shared-value-count')),
    reactState: textOf(findNode(roots, 'react-state-count')),
  };
}

function findNodeOrUndefined(nodes, identifier) {
  for (const node of nodes) {
    if (node.identifier === identifier) {
      return node;
    }
    const match = findNodeOrUndefined(node.children, identifier);
    if (match !== undefined) {
      return match;
    }
  }
  return undefined;
}

function textOf(node) {
  return node.value ?? node.label;
}
