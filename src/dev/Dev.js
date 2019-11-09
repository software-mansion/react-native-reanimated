import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, UIManager, SectionList, YellowBox, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';
import * as _ from 'lodash';

const RectButton = TouchableOpacity

YellowBox.ignoreWarnings(['measureLayoutRelativeToContainingList']);

function useDevUtil() {
  const [data, setData] = useState([]);
  useEffect(() => {
    ReanimatedModule.getDevUtil().then(setData);
  }, []);

  return useMemo(() => {
    const { viewManagers, ...nativeModules } = data;
    return [
      _.orderBy(_.map(nativeModules, (methods, key) => ({ methods, key })), 'key'),
      _.orderBy(_.map(viewManagers, (viewManager, index) => ({ key: viewManager, methods: UIManager.getViewManagerConfig(viewManager).Commands })))
    ];
  }, [data]);
}

const ItemSeparator = () => <View style={styles.separator} />;
const SectionHeader = ({ title }) => <Text style={[styles.sectionHeader]}>{title}</Text>;

function toFunctionAnnotation(method, params) {
  const p = _.join(_.map(params, ({ name, type }) => `${_.lowerCase(type)} ${name}`), ', ');
  return `${method}(${p})`
}

function toInvokeAnnotation(module, method, params) {
  const p = _.join(_.map(params, 'name'), ', ');
  const pp = p !== "" ? `, ${p}` : "";
  return `invoke("${module}", "${method}"${pp})`;
}

function toDispatchAnnotation(module, method) {
  return `dispatch("${module}", "${method}", map)`;
}

function Item({ item, section }) {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);
  const { key: title, methods } = item;
  const Cell = section.title === 'invoke' ? InvokeCell : DispatchCell;
  const data = useMemo(() => _.orderBy(_.map(methods, (m, key) => (_.assign(m, { key }))), 'key'), [methods]);

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
      //renderScrollComponent={p => <ScrollView {...p} />}
      />}
    </RectButton>
  );
}

function InvokeCell({ name, item }) {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);
  return (
    <RectButton style={styles.button} onPress={_onPress}>
      <Text style={[styles.buttonText]}>{!display ? item.key : toFunctionAnnotation(item.key, item)}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toInvokeAnnotation(name, item.key, item)}</Text>
    </RectButton>
  );
}

function DispatchCell({ name, item }) {
  const [display, setDisplay] = useState(false);
  const _onPress = useCallback(() => setDisplay(!display), [display]);
  console.log(item)
  return (
    <RectButton style={styles.button} onPress={_onPress} >
      <Text style={[styles.buttonText]}>{item.key}</Text>
      <Text style={[styles.buttonText, !display && styles.hidden]}>{toDispatchAnnotation(name, item.key)}</Text>
    </RectButton>
  );
}

function Dev() {
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
  /*
  const [displayingSections, setDisplayedSections] = useState(sections);

  useEffect(() => {
    setDisplayedSections(sections)
  }, [sections])
  */
  
  return (
    <SectionList
      style={styles.list}
      sections={sections}
      renderItem={(props) => <Item {...props} />}
      ItemSeparatorComponent={ItemSeparator}
      renderSectionHeader={(props) => <SectionHeader {...props} title={props.section.title} />}
      stickySectionHeadersEnabled
    //renderScrollComponent={p => <ScrollView {...p} />}
    />
  );
}

const DevUtil = __DEV__ ? Dev : () => null;

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
    backgroundColor: 'pink',
    color: 'black',
    textAlignVertical: 'center'
  }
});