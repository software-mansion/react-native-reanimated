import { runOnUIBlocking } from './runOnUIBlocking';

export async function isViewMountedNatively(tag: number) {
  const props = await runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, false);
  });
  return props !== null;
}
