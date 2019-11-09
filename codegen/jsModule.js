// eslint-disable-next-line no-unused-vars
import AnimatedNode from "../src/core/AnimatedNode";
import { Platform } from "react-native";

// NODES

// REGISTRY

export default function codegen(name) {
  return function (realNode) {
    if (Platform.OS !== 'ios') {
      return realNode
    }
    return function (...args) {
      // eslint-disable-next-line no-undef
      return new registry[name](args.map(a => a.__nodeID))
    }
  }
}
