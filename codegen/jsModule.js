// eslint-disable-next-line no-unused-vars
import AnimatedNode from "../src/core/AnimatedNode";

// NODES

// REGISTRY

export default function codegen(name) {
  return function (...args) {
    return function (...args) {
      // eslint-disable-next-line no-undef
      return new registry[name](args.map(a => a.__nodeID))
    }
  }
}
