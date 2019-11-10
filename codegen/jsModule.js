// eslint-disable-next-line no-unused-vars
import AnimatedNode from "../src/core/AnimatedNode";
import { Platform } from "react-native";

// NODES BEGIN
// NODES END

// REGISTRY BEGIN
const registry = {};
// REGISTRY END

export default function codegen(name) {
  return function (realNode) {
    if (Platform.OS !== 'ios') {
      return realNode
    }
    return function (...args) {
      return new registry[name](args.map(a => a.__nodeID))
    }
  }
}
