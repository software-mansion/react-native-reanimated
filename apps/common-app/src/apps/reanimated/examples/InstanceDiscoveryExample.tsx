/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Button,
  findNodeHandle,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
  StyleSheet,
} from 'react-native';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { Path as RNSVGPath } from 'react-native-svg';
import { makeMutable } from 'react-native-reanimated';
// @ts-expect-error No types for deep import.
import ReactFabric from 'react-native/Libraries/Renderer/shims/ReactFabric';

const findHostInstance_DEPRECATED = ReactFabric.findHostInstance_DEPRECATED as (
  ref: any
) => any;

// Make sure Reanimated and Worklets are initialized.
makeMutable(() => {
  'worklet';
  return undefined;
});

type ImperativeShadowNodeWrapper = {
  source: string;
  node: string | Node;
};

class Node {
  constructor(
    public objectId: number,
    public source: string,
    public ref: any
  ) {}

  ['name']?: string;
  ['findNodeHandle()']?: string;
  ['getScrollableNode()']?: string;
  ['getScrollResponder()']?: string | Node;
  ['getNativeScrollRef()']?: string | Node;
  ['getScrollRef()']?: string | Node;
  ['__internalInstanceHandle']?: string | Node;
  ['findHostInstance_DEPRECATED()']?: string | Node;
  ['_hasAnimatedRef']?: string;
  ['_componentRef']?: string | Node;
  ['stateNode.node']?: string | Node;
  ['shadowNodeWrapper']?: string;
  ['shadowNodeWrapperTag']?: string;
  ['_reactInternals']?: string | undefined;
  ['imperativeShadowNodeWrappers']?: ImperativeShadowNodeWrapper[];
}

let refId = 1;
let foundRefToId = new Map<any, number>();

let handleId = 1;
let handleToHandleId = new Map<number, number>();

let shadowNodeWrapperId = 1;
let shadowNodeWrapperToShadowNodeWrapperId = new Map<any, number>();

let rootNode: Node | undefined = undefined;

let visited = new Set<any>();

function getRefChecker(name: string) {
  return (ref: any) => {
    refId = 1;
    foundRefToId = new Map<any, number>();

    handleId = 1;
    handleToHandleId = new Map<number, number>();

    shadowNodeWrapperId = 1;
    shadowNodeWrapperToShadowNodeWrapperId = new Map<any, number>();

    rootNode = new Node(refId++, '', ref);
    rootNode.name = `"${name}"`;

    visited = new Set<any>();

    startComparison(rootNode);
  };
}

const nodesToCheck: Node[] = [];

function startComparison(node: Node) {
  if (!node.ref) {
    return;
  }

  indent = '';
  nodesToCheck.push(node);
  foundRefToId.set(node.ref, node.objectId);

  findNativeStateObjects(node, node.ref, '');
  while (nodesToCheck.length) {
    const next = nodesToCheck.shift()!;
    comparator(next);
  }

  printNode(node);
  print();
}

function comparator(node: Node) {
  const { ref, source } = node;

  const refMethodNames = [
    'getNativeScrollRef',
    'getScrollRef',
    'getScrollResponder',
    '__internalInstanceHandle',
  ] as const;

  investigateNode(node);

  let hostInstance;
  const hostInstanceSource = `findHostInstance_DEPRECATED()`;
  try {
    hostInstance = findHostInstance_DEPRECATED(ref);
  } catch {
    node[hostInstanceSource] = '"ERROR"';
  }
  if (ref._reactInternals) {
    node._reactInternals = '"PRESENT"';
  }

  refMethodNames.forEach((methodName) => {
    const refMethod = ref[methodName];
    if (refMethod) {
      const derivedRef =
        typeof refMethod === 'function' ? refMethod.call(ref) : refMethod;

      if (!derivedRef) {
        return;
      }

      const propName =
        typeof refMethod === 'function' ? `${methodName}()` : methodName;

      const derivedSource = `${source}.${propName}`;

      if (foundRefToId.has(derivedRef)) {
        // @ts-expect-error This can't be fixed.
        node[propName] = `"OBJECT ${foundRefToId.get(derivedRef)}"`;
      } else {
        const id = refId++;
        foundRefToId.set(derivedRef, id);
        const newNode = new Node(id, derivedSource, derivedRef);
        // @ts-expect-error This can't be fixed.
        node[propName as keyof Node] = newNode;
        nodesToCheck.push(newNode);
      }
    }
  });

  if (hostInstance) {
    if (foundRefToId.has(hostInstance)) {
      node['findHostInstance_DEPRECATED()'] =
        `"OBJECT ${foundRefToId.get(hostInstance)}"`;
    } else {
      const id = refId++;
      foundRefToId.set(hostInstance, id);
      const propName = 'findHostInstance_DEPRECATED()';
      const derivedSource = `${source}.${propName}`;
      const newNode = new Node(id, derivedSource, hostInstance);
      node[propName] = newNode;
      nodesToCheck.push(newNode);
    }
  }

  if (ref.stateNode?.node) {
    const derivedRef = ref.stateNode.node;
    if (foundRefToId.has(derivedRef)) {
      node['stateNode.node'] = `"OBJECT ${foundRefToId.get(derivedRef)}"`;
    } else {
      const id = refId++;
      foundRefToId.set(derivedRef, id);
      const propName = 'stateNode.node';
      const derivedSource = `${source}.${propName}`;
      const newNode = new Node(id, derivedSource, derivedRef);
      node[propName] = newNode;
      nodesToCheck.push(newNode);
    }
  }

  if (ref._hasAnimatedRef) {
    node._hasAnimatedRef = '"YES"';
    const derivedRef = ref._componentRef;
    if (derivedRef) {
      if (foundRefToId.has(derivedRef)) {
        node['_componentRef'] = `"OBJECT ${foundRefToId.get(derivedRef)}"`;
      } else {
        const id = refId++;
        foundRefToId.set(derivedRef, id);
        const propName = '_componentRef';
        const derivedSource = `${source}.${propName}`;
        const newNode = new Node(id, derivedSource, derivedRef);
        node[propName] = newNode;
        nodesToCheck.push(newNode);
      }
    } else {
      node['_componentRef'] = '"NO"';
    }
  }
}

const printableProps = [
  'name',
  'objectId',
  'findNodeHandle()',
  'getScrollableNode()',
  'getScrollResponder()',
  'getNativeScrollRef()',
  'getScrollRef()',
  '__internalInstanceHandle',
  '_hasAnimatedRef',
  '_componentRef',
  'findHostInstance_DEPRECATED()',
  'stateNode.node',
  'shadowNodeWrapper',
  'shadowNodeWrapperTag',
  '_reactInternals',
] as const;

let indent = '';

function print(...args: any[]) {
  console.log(`${indent}${args.join(' ')}`);
}

function increaseIndent() {
  indent = indent + '    ';
}

function decreaseIndent() {
  indent = indent.slice(0, -4);
}

function printNode(node: Node | number | string, prop?: string) {
  if (!(node instanceof Node)) {
    print(`"${prop}": ${node}`);
    return;
  }

  if (prop) {
    print(`"${prop}": {`);
  } else {
    print('{');
  }
  increaseIndent();

  printableProps.forEach((key) => {
    if (node[key]) {
      printNode(node[key], key);
    }
  });

  if (node.imperativeShadowNodeWrappers) {
    print('"deepShadowNodeWrappersProps": {');
    increaseIndent();
    for (const wrapper of node.imperativeShadowNodeWrappers) {
      printImperativeShadowNodeWrapper(wrapper);
    }
    decreaseIndent();
    print('}');
  }

  decreaseIndent();
  print('}');
}

function printImperativeShadowNodeWrapper(
  wrapper: ImperativeShadowNodeWrapper
) {
  const { source, node } = wrapper;
  if (typeof node === 'string') {
    print(`"${wrapper.source}": ${node}`);
    return;
  }

  print(`"${source}":`);
  increaseIndent();
  printNode(node);
  decreaseIndent();
  print('}');
}

const hasNativeState: (ref: any) => boolean =
  (globalThis as any).__hasNativeState ?? (() => false);

const getTagFromShadowNodeWrapper: (ref: any) => number =
  (globalThis as any).__getTagFromShadowNodeWrapper ?? (() => -1);

function investigateNode(node: Node) {
  checkNativeState(node);
  checkFindNodeHandle(node);
  checkScrollableNode(node);
  findNativeStateObjects(rootNode!, node.ref, node.source);
}

function checkFindNodeHandle(node: Node) {
  const { ref } = node;

  let handle;
  try {
    handle = findNodeHandle(ref);
    if (handle === undefined) {
      return;
    }
    if (typeof handle !== 'number') {
      throw new Error(
        'findNodeHandle returned a non-number' + typeof handle + handle
      );
    }
    const id = handleToHandleId.get(handle) ?? handleId++;
    handleToHandleId.set(handle, id);
    node['findNodeHandle()'] = `"TAG ${id}"`;
  } catch {
    node['findNodeHandle()'] = '"ERROR"';
    return;
  }
}

function checkScrollableNode(node: Node) {
  const { ref } = node;
  if (!ref.getScrollableNode) {
    return;
  }
  const handle = ref.getScrollableNode();
  if (handle === undefined) {
    node['getScrollableNode()'] = '"undefined"';
  }
  if (typeof handle !== 'number') {
    throw new Error(
      'getScrollableNode() returned a non-number' + typeof handle + handle
    );
  }
  const id = handleToHandleId.get(handle) ?? handleId++;
  handleToHandleId.set(handle, id);
  node['getScrollableNode()'] = `"TAG ${id}"`;
}

function checkNativeState(node: Node) {
  const { ref } = node;
  const nativeState = hasNativeState(ref);
  if (!nativeState) {
    return;
  }
  if (shadowNodeWrapperToShadowNodeWrapperId.has(ref)) {
    node.shadowNodeWrapper = `"SHADOW_NODE_WRAPPER ${shadowNodeWrapperToShadowNodeWrapperId.get(ref)}"`;
  } else {
    const id = shadowNodeWrapperId++;
    shadowNodeWrapperToShadowNodeWrapperId.set(ref, id);
    node.shadowNodeWrapper = `"SHADOW_NODE_WRAPPER ${id}"`;
  }
  const handle = getTagFromShadowNodeWrapper(ref);
  const id = handleToHandleId.get(handle) ?? handleId++;
  handleToHandleId.set(handle, id);
  node.shadowNodeWrapperTag = `"TAG ${id}"`;
}

function findNativeStateObjects(node: Node, ref: any, source: string = '') {
  if (visited.has(ref) || ref === null || typeof ref !== 'object') {
    return;
  }
  visited.add(ref);
  if (hasNativeState(ref)) {
    node.imperativeShadowNodeWrappers = node.imperativeShadowNodeWrappers ?? [];

    const id =
      shadowNodeWrapperToShadowNodeWrapperId.get(ref) ?? shadowNodeWrapperId++;
    shadowNodeWrapperToShadowNodeWrapperId.set(ref, id);

    const newNode = new Node(id, source, ref);
    // @ts-expect-error It's ok.
    delete newNode.objectId;
    newNode.shadowNodeWrapper = `"SHADOW_NODE_WRAPPER ${id}"`;
    const handle = getTagFromShadowNodeWrapper(ref);
    const hId = handleToHandleId.get(handle) ?? handleId++;
    handleToHandleId.set(handle, hId);
    newNode.shadowNodeWrapperTag = `"TAG ${hId}"`;

    if (
      !node.imperativeShadowNodeWrappers.some(
        (wrapper) => wrapper.source === source
      )
    ) {
      node.imperativeShadowNodeWrappers.push({
        source,
        node: newNode,
      });
    }
  }

  const ignoredKeys = new Set([
    'children',
    'child',
    'next',
    'pendingChildren',
    'return',
    '_debugOwner',
  ]);

  for (const key of Object.keys(ref)) {
    if (ignoredKeys.has(key)) {
      continue;
    }
    findNativeStateObjects(node, ref[key], `${source}.${key}`);
  }
}

export default function InstanceDiscoveryExample() {
  return (
    <>
      <Text style={styles.headingText}>
        Instance Discovery Example. Check the outputs in the console to see
        where correct host instances are found. This example throws when exited.
      </Text>
      <ActivityIndicator ref={getRefChecker('ActivityIndicator')} />
      <Button title="Button" onPress={() => {}} ref={getRefChecker('Button')} />
      <FlatList
        data={[]}
        renderItem={() => null}
        ref={getRefChecker('FlatList')}
      />
      <Image
        source={{ uri: 'https://reactnative.dev/img/tiny_logo.png' }}
        style={{ width: 50, height: 50 }}
        ref={getRefChecker('Image')}
      />
      <ImageBackground
        source={{ uri: 'https://reactnative.dev/img/tiny_logo.png' }}
        style={{ width: 50, height: 50 }}
        ref={getRefChecker('ImageBackground')}
      />
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        ref={getRefChecker('KeyboardAvoidingView')}>
        <Text>KeyboardAvoidingView</Text>
      </KeyboardAvoidingView>
      <Modal visible={false} ref={getRefChecker('Modal')}>
        <Text>Modal Content</Text>
      </Modal>
      <Pressable onPress={() => {}} ref={getRefChecker('Pressable')}>
        <Text>Pressable</Text>
      </Pressable>
      <RefreshControl
        refreshing={false}
        onRefresh={() => {}}
        ref={getRefChecker('RefreshControl')}
      />
      <ScrollView ref={getRefChecker('ScrollView')}>
        <Text>ScrollView Content</Text>
      </ScrollView>

      <SectionList
        sections={[]}
        renderItem={() => null}
        keyExtractor={(item, index) => index.toString()}
        ref={getRefChecker('SectionList')}
      />

      <Switch ref={getRefChecker('Switch')} />
      <Text ref={getRefChecker('Text')}>Sample Text</Text>
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
        ref={getRefChecker('TextInput')}
      />
      <TouchableHighlight
        onPress={() => {}}
        ref={getRefChecker('TouchableHighlight')}>
        <Text>TouchableHighlight</Text>
      </TouchableHighlight>
      <TouchableOpacity
        onPress={() => {}}
        ref={getRefChecker('TouchableOpacity')}>
        <Text>TouchableOpacity</Text>
      </TouchableOpacity>
      <TouchableWithoutFeedback
        onPress={() => {}}
        ref={getRefChecker('TouchableWithoutFeedback')}>
        <Text>TouchableWithoutFeedback</Text>
      </TouchableWithoutFeedback>
      <VirtualizedList
        data={[]}
        getItemCount={() => 0}
        getItem={() => null}
        renderItem={() => null}
        keyExtractor={(item, index) => index.toString()}
        ref={getRefChecker('VirtualizedList')}
      />
      <View ref={getRefChecker('View')} />
      <FlashList
        data={[]}
        renderItem={() => null}
        ref={getRefChecker('FlashList')}
      />
      <RNGHScrollView ref={getRefChecker('RNGHScrollView')}>
        <Text>RNGH ScrollView Content</Text>
      </RNGHScrollView>
      <RNSVGPath
        ref={getRefChecker('SVG Path')}
        d="M150 0 L75 200 L225 200 Z"
        fill="lime"
        stroke="purple"
        strokeWidth="1"
      />
    </>
  );
}

const styles = StyleSheet.create({
  headingText: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
