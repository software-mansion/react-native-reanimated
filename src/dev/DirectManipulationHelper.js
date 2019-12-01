import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, UIManager, SectionList, YellowBox, FlatList, TouchableOpacity, TextInput } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';


YellowBox.ignoreWarnings(['measureLayoutRelativeToContainingList']);

const RectButton = TouchableOpacity;

function sanitizeIterator(collection, iterator) {
  if (!Array.isArray(collection) && (!iterator || iterator === 'key')) {
    return (val, key) => key;
  } else if (typeof iterator === 'string' || typeof iterator === 'number') {
    return (o, k) => o[iterator];
  } else if (!iterator) {
    return (a) => a;
  } else {
    return iterator;
  }
}

function map(collection, iterator) {
  if (!collection) collection = [];
  const it = sanitizeIterator(collection, iterator);
  if (!Array.isArray(collection)) {
    return Object.keys(collection)
      .map((key, index) => it(collection[key], key, collection));
  } else {
    return collection.map(it);
  }
}

function compareFunc(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}

function orderBy(collection, iterator) {
  const out = collection || [];
  const it = sanitizeIterator(collection, iterator);

  if (!Array.isArray(out)) {
    return Object.keys(collection)
      .sort((a, b) => compareFunc(it(collection[a], a, collection), it(collection[b], b, collection)))
      .map((key) => collection[key])
  } else {
    return out.map((value, index, collection) => [value, it(value, index, collection)])
      .sort((a, b) => compareFunc(a[1], b[1]))
      .map(([value]) => value);
  }
}

function useDevUtil() {
  const [data, setData] = useState([]);
  useEffect(() => {
    ReanimatedModule.getDirectManipulationUtil().then(setData);
  }, []);

  return useMemo(() => {
    const { viewManagers, ...nativeModules } = data;
    return [
      orderBy(map(nativeModules, (methods, key) => ({ methods, key })), 'key'),
      orderBy(map(viewManagers, ((viewManager) => ({ key: viewManager, methods: UIManager.getViewManagerConfig(viewManager).Commands }))), 'key')
    ];
  }, [data]);
}

const ItemSeparator = () => <View style={styles.separator} />;
const SectionHeader = ({ title }) => <Text style={[styles.sectionHeader]}>{title}</Text>;

function toFunctionAnnotation(method, params) {
  const p = map(params, ({ name, type }) => `${type.toLowerCase()} ${name}`).join(', ');
  return `${method}(${p})`
}

function toInvokeAnnotation(module, method, params) {
  const p = map(params, ({ name }) => name).join(', ');
  const pp = p !== "" ? `, ${p}` : "";
  return `invoke("${module}", "${method}"${pp})`;
}

function toDispatchAnnotation(module, method) {
  return `dispatch("${module}", "${method}", tag, ...args)`;
}

function toDispatchLegacyAnnotation(module, method) {
  return `Legacy:\nUIManager.dispatchViewManagerCommand(tag, "${method}", args)`;
}

function Item({ item, section }) {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);
  const { key: title, methods } = item;
  const Cell = section.title === 'invoke' ? InvokeCell : DispatchCell;

  const data = useMemo(() => orderBy(map(methods, (m, key) => ({ params: m, key })), 'key'), [methods]);

  return (
    <RectButton style={styles.button} onPress={_onPress} enabled={data.length > 0} disabled={data.length === 0}>
      <Text style={[styles.buttonText, data.length === 0 && styles.disabledText]}>{title}</Text>
      {display && <FlatList
        listKey={`${section.key}:${item.key}`}
        collapsable={false}
        style={[styles.list]}
        data={data}
        keyExtractor={(method, i) => `${section.key}:${item.key}:${method.key}`}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={(p) => (
          <Cell
            name={title}
            {...p}
          />
        )}
      // renderScrollComponent={p => <ScrollView {...p} />}
      />}
    </RectButton>
  );
}

function InvokeCell({ name, item }) {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);
  return (
    <RectButton style={styles.button} onPress={_onPress}>
      <Text style={[styles.buttonText, styles.methodTitle]}>{!display ? item.key : toFunctionAnnotation(item.key, item.params)}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toInvokeAnnotation(name, item.key, item.params)}</Text>
    </RectButton>
  );
}

function DispatchCell({ name, item }) {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);

  return (
    <RectButton style={styles.button} onPress={_onPress} >
      <Text style={[styles.buttonText, styles.methodTitle]}>{item.key}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toDispatchAnnotation(name, item.key)}</Text>
      <Text style={[styles.buttonText, styles.legacy, !display && styles.hidden]}>{toDispatchLegacyAnnotation(name, item.key)}</Text>
    </RectButton>
  );
}

function DirectManipulationHelper() {
  const [nativeModules, viewManagers] = useDevUtil();
  const sections = useMemo(() => ([
    {
      key: 'nativeModules',
      title: 'invoke',
      data: nativeModules,
      keyExtractor: (item, i) => `nativeModules:${item.key}`
    },
    {
      key: 'viewManagers',
      title: 'dispatch',
      data: viewManagers,
      keyExtractor: (item, i) => `viewManagers:${item.key}`
    }
  ]), [nativeModules, viewManagers]);

  const [displayingSections, setDisplayedSections] = useState(sections);
  const [input, setInput] = useState("");

  useEffect(() => {
    setDisplayedSections(sections)
  }, [sections]);

  const filterResults = useCallback((text) => {
    text = text.toLowerCase();
    setInput(text);
    setDisplayedSections(text === "" ?
      sections :
      map(sections, (s) => {
        const section = {};
        Object.assign(section, s, {
          data: s.data.filter(({ key, methods }) => {
            return key.toLowerCase().includes(text) ||
              Object.keys(methods || {}).some((method) => method.toLowerCase().includes(text));
          })
        });
        return section;
      })
    );
  })

  return (
    <>
      <Text>
        Available methods and commands to use with invoke and dispatch respectively.
        </Text>
      <Text>
        The crossed fields indicate it was impossible to positively determine availability.
        </Text>
      <TextInput
        style={styles.textInput}
        onChangeText={filterResults}
        value={input}
        placeholder="Type here to filter..."
        autoCapitalize='none'
      />
      <SectionList
        style={styles.list}
        sections={displayingSections}
        renderItem={(props) => <Item {...props} />}
        ItemSeparatorComponent={ItemSeparator}
        renderSectionHeader={(props) => <SectionHeader {...props} title={props.section.title} />}
        stickySectionHeadersEnabled
      />
    </>
  );
}

const DevUtil = __DEV__ ? DirectManipulationHelper : () => null;

export default DevUtil;

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
    padding: 5
  },
  disabledText: {
    color: 'grey',
    textDecorationLine: 'line-through'
  },
  methodTitle: {
    fontWeight: 'bold'
  },
  legacy: {
    opacity: 0.4
  },
  button: {
    flex: 1,
    minHeight: 60,
    padding: 10,
    backgroundColor: '#fff',
    color: 'black'
  },
  hidden: {
    display: 'none'
  },
  sectionHeader: {
    flex: 1,
    padding: 10,
    elevation: 2,
    backgroundColor: 'pink',
    color: 'black',
    textAlignVertical: 'center'
  },
  textInput: {
    elevation: 5,
    backgroundColor: '#EFEFF4',
  }
});
