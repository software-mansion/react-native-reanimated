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
    const { viewManagers, nativeModules, JSEvents } = data;
    return [
      {
        nativeModules: orderBy(map(nativeModules, (methods, key) => ({ methods, key })), 'key'),
        viewManagers: orderBy(map(viewManagers, ((viewManager) => ({ key: viewManager, methods: UIManager.getViewManagerConfig(viewManager).Commands }))), 'key'),
        JSEvents: orderBy(map(JSEvents, (event, key) => ({ event, key })), 'key'),
      },
      () => ReanimatedModule.getDirectManipulationUtil().then(setData)
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

function toInterceptAnnotation(eventName, eventTemplate) {
  return `intercept("${eventName}", ${JSON.stringify(eventTemplate, null, '\t')})`;
}

function ItemManager(props) {
  switch (props.section.title) {
    case 'invoke':
    case 'dispatch':
      return <Item {...props} />
      break
    case 'intercept':
      return <InterceptCell {...props} />
      break;
    default:
      return null;
  }
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

function useHandleDisplay() {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);
  return [display, _onPress];
}

function InvokeCell({ name, item }) {
  const [display, _onPress] = useHandleDisplay();
  return (
    <RectButton style={styles.button} onPress={_onPress}>
      <Text style={[styles.buttonText, styles.bold]}>{!display ? item.key : toFunctionAnnotation(item.key, item.params)}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toInvokeAnnotation(name, item.key, item.params)}</Text>
    </RectButton>
  );
}

function DispatchCell({ name, item }) {
  const [display, _onPress] = useHandleDisplay();
  return (
    <RectButton style={styles.button} onPress={_onPress} >
      <Text style={[styles.buttonText, styles.bold]}>{item.key}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toDispatchAnnotation(name, item.key)}</Text>
      <Text style={[styles.buttonText, styles.legacy, !display && styles.hidden]}>{toDispatchLegacyAnnotation(name, item.key)}</Text>
    </RectButton>
  );
}

function InterceptCell({ item }) {
  const [display, _onPress] = useHandleDisplay();
  return (
    <RectButton style={styles.button} onPress={_onPress} >
      <Text style={[styles.buttonText, styles.bold]}>{item.key}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toInterceptAnnotation(item.key, item.event)}</Text>
    </RectButton>
  );
}

function DirectManipulationHelper() {
  const [{ nativeModules, viewManagers, JSEvents }, invalidate] = useDevUtil();
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
    },
    {
      key: 'JSEvents',
      title: 'intercept',
      data: JSEvents,
      keyExtractor: (item, i) => `JSEvents:${item.key}`
    }
  ]), [nativeModules, viewManagers]);

  const [displayingSections, setDisplayedSections] = useState(sections);
  const [input, setInput] = useState("");
  const [displayInfo, setDisplayInfo] = useState(true);

  useEffect(() => {
    setDisplayedSections(sections);
    const m = setTimeout(() => setDisplayInfo(false), 15000);
    () => clearTimeout(m);
  }, [sections]);

  const filterResults = useCallback((text) => {
    text = text.toLowerCase();
    setInput(text);
    setDisplayedSections(text === "" ?
      sections :
      map(sections, (s) => {
        const section = {};
        Object.assign(section, s, {
          data: s.data.filter(({ key, methods, event }) => {
            return key.toLowerCase().includes(text) ||
              Object.keys(methods || {}).some((method) => method.toLowerCase().includes(text)) ||
              JSON.stringify(event || {}).toLowerCase().includes(text);
          })
        });
        return section;
      })
    );
  })

  return (
    <>
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
        renderItem={(props) => <ItemManager {...props} />}
        ItemSeparatorComponent={ItemSeparator}
        renderSectionHeader={(props) => <SectionHeader {...props} title={props.section.title} />}
        stickySectionHeadersEnabled
      />
      <TouchableOpacity
        onPress={() => setDisplayInfo(false)}
        onLongPress={() => trycopy()}
        style={[!displayInfo && styles.hidden, styles.infoContainer]}
      >
        <Text>
          This list displays available methods, commands and events to use with direct manipulation nodes.
        </Text>
        <Text>
          The crossed fields indicate it was impossible to positively determine availability.
        </Text>
        <Text style={styles.bold}>
          Intercept:
        </Text>
        <Text>
          Only events that were intercepted during runtime are visible.
          So if you're looking for something in particular make your app run the event and long press this text
        </Text>
        <Text style={styles.bold}>
          Press to minimize.
        </Text>
      </TouchableOpacity>
      {
        !displayInfo && <TouchableOpacity
          style={[styles.infoButton]}
          onPress={() => setDisplayInfo(!displayInfo)}
          onLongPress={() => invalidate()}
        >
          <Text style={[styles.bold]}>i</Text>
        </TouchableOpacity>
      }

    </>
  );
}

const DevUtil = __DEV__ ? DirectManipulationHelper : () => null;
DevUtil.directManipulationUtil = () => __DEV__ ? ReanimatedModule.getDirectManipulationUtil() : Promise.resolve({});

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
  bold: {
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
  },
  infoButton: {
    position: 'absolute',
    bottom: 0,
    margin: 10,
    width: 50,
    height: 50,
    backgroundColor: 'lightblue',
    zIndex: 1,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoContainer: {
    padding: 5,
    margin: 5,
    borderTopWidth: 2,
    borderColor: '#EFEFF4'
  }
});
