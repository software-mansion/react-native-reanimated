import {
  describe,
  expect,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  test,
  waitForAnimationUpdates,
} from '../../ReJest/RuntimeTestsApi';
import {
  AssignAnimationExample,
  AssignValueExample,
  EnteringExample,
  ExitingExample,
  LayoutExample,
} from './Components';
import { Snapshot } from './StrictMode.snapshot';

describe('StrictMode', () => {
  test('Run animation - assign value', async () => {
    const snapshot = Snapshot.assignValue;
    await mockAnimationTimer();
    const updateContainer = await recordAnimationUpdates();

    await render(<AssignValueExample />);
    await waitForAnimationUpdates(snapshot.length);

    const jsUpdates = updateContainer.getUpdates();
    const nativeUpdates = await updateContainer.getNativeSnapshots();
    expect(jsUpdates).toMatchSnapshots(snapshot);
    expect(jsUpdates).toMatchNativeSnapshots(nativeUpdates);
  });

  test('Run animation - assign animation', async () => {
    const snapshot = Snapshot.assignAnimation;
    await mockAnimationTimer();
    const updateContainer = await recordAnimationUpdates();

    await render(<AssignAnimationExample />);
    await waitForAnimationUpdates(snapshot.length);

    const jsUpdates = updateContainer.getUpdates();
    const nativeUpdates = await updateContainer.getNativeSnapshots();
    expect(jsUpdates).toMatchSnapshots(snapshot);
    expect(jsUpdates).toMatchNativeSnapshots(nativeUpdates);
  });

  test('Entering animation', async () => {
    const snapshot = Snapshot.entering;
    await mockAnimationTimer();
    const updateContainer = await recordAnimationUpdates();

    await render(<EnteringExample />);
    await waitForAnimationUpdates(snapshot.length);

    const jsUpdates = updateContainer.getUpdates();
    const nativeUpdates = await updateContainer.getNativeSnapshots();
    expect(jsUpdates).toMatchSnapshots(snapshot);
    expect(jsUpdates).toMatchNativeSnapshots(nativeUpdates);
  });

  test('Layout animation', async () => {
    const snapshot = Snapshot.layout;
    await mockAnimationTimer();
    const updateContainer = await recordAnimationUpdates();

    await render(<LayoutExample />);
    await waitForAnimationUpdates(snapshot.length);

    const jsUpdates = updateContainer.getUpdates();
    expect(jsUpdates).toMatchSnapshots(snapshot);
  });

  test('Exiting animation', async () => {
    const snapshot = Snapshot.exiting;
    await mockAnimationTimer();
    const updateContainer = await recordAnimationUpdates();

    await render(<ExitingExample />);
    await waitForAnimationUpdates(snapshot.length);

    const jsUpdates = updateContainer.getUpdates();
    expect(jsUpdates).toMatchSnapshots(snapshot);
  });
});
