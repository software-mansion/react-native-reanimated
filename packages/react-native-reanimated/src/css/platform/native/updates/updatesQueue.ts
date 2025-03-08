import { ReanimatedModule } from '../../../../ReanimatedModule';
import type { AnyCSSUpdate, CSSUpdate, CSSUpdateType } from './types';

class CSSUpdatesQueue {
  private updates: AnyCSSUpdate[] = [];

  add<T extends CSSUpdateType>(update: CSSUpdate<T>) {
    this.updates.push(update);
    // temporary
    this.flush();
  }

  flush() {
    if (this.updates.length === 0) {
      return;
    }

    ReanimatedModule.commitCSSUpdates(this.updates);
    this.updates = [];
  }
}

const updatesQueue = new CSSUpdatesQueue();

export default updatesQueue;
