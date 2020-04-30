import InternalAnimatedValue from './InternalAnimatedValue';
import AnimatedNode from './AnimatedNode';
import { val } from '../val';

class AnimatedMainClock extends InternalAnimatedValue {
  _frameCallback;

  constructor() {
    super(Date.now());
  }

  __onEvaluate() {
    return Date.now();
  }

  _runFrame = () => {
    this._updateValue(this.__onEvaluate());
    if (this.__children.length > 0) {
      this._frameCallback = requestAnimationFrame(this._runFrame);
    }
  };

  __attach() {
    super.__attach();
    if (!this._frameCallback) {
      this._frameCallback = requestAnimationFrame(this._runFrame);
    }
  }

  __detach() {
    if (this._frameCallback) {
      cancelAnimationFrame(this._frameCallback);
      this._frameCallback = null;
    }
    super.__detach();
  }
}

const mainClock = new AnimatedMainClock();

export default class AnimatedClock extends AnimatedNode {
  _started;
  _attached;

  constructor() {
    super({ type: 'clock' });
  }

  toString() {
    return `AnimatedClock, id: ${this.__nodeID}`;
  }

  __onEvaluate() {
    return val(mainClock);
  }

  __attach() {
    super.__attach();
    if (this._started && !this._attached) {
      mainClock.__addChild(this);
    }
    this._attached = true;
  }

  __detach() {
    if (this._started && this._attached) {
      mainClock.__removeChild(this);
    }
    this._attached = false;
    super.__detach();
  }

  start() {
    if (!this._started && this._attached) {
      mainClock.__addChild(this);
    }
    this._started = true;
  }

  stop() {
    if (this._started && this._attached) {
      mainClock.__removeChild(this);
    }
    this._started = false;
  }

  isStarted() {
    return this._started;
  }
}

