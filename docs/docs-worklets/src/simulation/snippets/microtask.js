import { scheduleOnRN } from '../worklets';

export function* later() {
  yield console.log('later');
}

export default function* main() {
  yield scheduleOnRN(later);
  yield console.log('sync');
}
