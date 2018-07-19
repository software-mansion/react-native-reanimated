import AnimatedNode from './AnimatedNode';
import AnimatedValue from './AnimatedValue';

class AnimatedRPN extends AnimatedNode {
  constructor(expression, isOperator, nodes) {
    super(
      {
        type: 'rpn',
        expression,
        isOperator,
      },
      nodes
    );
  }
}
export default class AnimatedRPNBuilder {
  nodes = [];
  expression = [];
  isOperator = [];
  build() {
    return new AnimatedRPN(this.expression, this.isOperator, this.nodes);
  }
  node(value) {
    const wrapped =
      typeof value === 'object' ? value : new AnimatedValue(value);
    this.expression.push(wrapped.__nodeID);
    this.isOperator.push(false);
    if (this.nodes.indexOf(wrapped) === -1) {
      this.nodes.push(wrapped);
    }
    return this;
  }
  add() {
    this.isOperator.push(true);
    this.expression.push(0);
    return this;
  }
  sub() {
    this.isOperator.push(true);
    this.expression.push(1);
    return this;
  }
  modulo() {
    this.isOperator.push(true);
    this.expression.push(5);
    return this;
  }
  multiply() {
    this.isOperator.push(true);
    this.expression.push(2);
    return this;
  }
  divide() {
    this.isOperator.push(true);
    this.expression.push(3);
    return this;
  }
  pow() {
    this.isOperator.push(true);
    this.expression.push(4);
    return this;
  }
  exp() {
    this.isOperator.push(true);
    this.expression.push(8);
    return this;
  }
  round() {
    this.isOperator.push(true);
    this.expression.push(9);
    return this;
  }
  sqrt() {
    this.isOperator.push(true);
    this.expression.push(10);
    return this;
  }
  cos() {
    this.isOperator.push(true);
    this.expression.push(7);
    return this;
  }
  sin() {
    this.isOperator.push(true);
    this.expression.push(6);
    return this;
  }
  debug() {
    this.isOperator.push(true);
    this.expression.push(11);
    return this;
  }
}
