import { val } from '../val';
import AnimatedNode from './AnimatedNode';
import { adapt } from '../core/AnimatedBlock';

class AnimatedCond extends AnimatedNode {
  _condition;
  _ifBlock;
  _elseBlock;

  constructor(condition, ifBlock, elseBlock) {
    super(
      {
        type: 'cond',
        cond: condition.__nodeID,
        ifBlock: ifBlock.__nodeID,
        elseBlock: elseBlock ? elseBlock.__nodeID : undefined,
      },
      [condition, ifBlock, elseBlock]
    );
    this._condition = condition;
    this._ifBlock = ifBlock;
    this._elseBlock = elseBlock;
  }

  __onEvaluate() {
    if (val(this._condition)) {
      return val(this._ifBlock);
    } else {
      return this._elseBlock !== undefined ? val(this._elseBlock) : undefined;
    }
  }
}

export function createAnimatedCond(cond, ifBlock, elseBlock) {
  return new AnimatedCond(
    adapt(cond),
    adapt(ifBlock),
    elseBlock === undefined ? undefined : adapt(elseBlock)
  );
}
