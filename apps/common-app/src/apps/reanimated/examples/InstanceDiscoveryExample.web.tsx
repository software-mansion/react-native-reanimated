/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Button,
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
  // TouchableWithoutFeedback doesn't accept refs.
  // TouchableWithoutFeedback,
  View,
  VirtualizedList,
  StyleSheet,
} from 'react-native';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { Path as RNSVGPath } from 'react-native-svg';
import { makeMutable } from 'react-native-reanimated';

// Make sure Reanimated and Worklets are initialized.
makeMutable(() => {
  'worklet';
  return undefined;
});

class Node {
  constructor(
    public objectId: number,
    public source: string,
    public ref: any
  ) {}

  ['name']?: string;
  ['getScrollableNode()']?: string;
  ['getScrollResponder()']?: string | Node;
  ['getNativeScrollRef()']?: string | Node;
  ['getScrollRef()']?: string | Node;
  ['scrollTo()']?: string;
  ['__internalInstanceHandle']?: string | Node;
  ['findHostInstance_DEPRECATED()']?: string | Node;
  ['_hasAnimatedRef']?: string;
  ['_componentRef']?: string | Node;
  ['stateNode.node']?: string | Node;
  ['_reactInternals']?: string | undefined;
}

let refId = 1;
let foundRefToId = new Map<any, number>();

let rootNode: Node | undefined = undefined;

function getRefChecker(name: string) {
  return (ref: any) => {
    refId = 1;
    foundRefToId = new Map<any, number>();

    rootNode = new Node(refId++, '', ref);
    rootNode.name = `"${name}"`;

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
    'getScrollableNode',
    'getScrollRef',
    'getScrollResponder',
    '__internalInstanceHandle',
  ] as const;

  investigateNode(node);

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

function investigateNode(node: Node) {
  const { ref } = node;

  if (ref.scrollTo) {
    node['scrollTo()'] = '"PRESENT"';
  }
}

const printableProps = [
  'name',
  'objectId',
  'getScrollableNode()',
  'getScrollResponder()',
  'getNativeScrollRef()',
  'getScrollRef()',
  'scrollTo()',
  '__internalInstanceHandle',
  '_hasAnimatedRef',
  '_componentRef',
  'stateNode.node',
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

  decreaseIndent();
  print('}');
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
