/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

import type {ViewStyleProp} from '../StyleSheet/StyleSheet';

const TouchableHighlight = require('../Components/Touchable/TouchableHighlight');
const TouchableWithoutFeedback = require('../Components/Touchable/TouchableWithoutFeedback');
const View = require('../Components/View/View');
const openFileInEditor = require('../Core/Devtools/openFileInEditor');
const flattenStyle = require('../StyleSheet/flattenStyle');
const StyleSheet = require('../StyleSheet/StyleSheet');
const Text = require('../Text/Text');
const mapWithSeparator = require('../Utilities/mapWithSeparator');
const BoxInspector = require('./BoxInspector');
const StyleInspector = require('./StyleInspector');
const React = require('react');

type Props = $ReadOnly<{|
  hierarchy: Array<{|name: string|}>,
  style?: ?ViewStyleProp,
  source?: ?{
    fileName?: string,
    lineNumber?: number,
    ...
  },
  frame?: ?Object,
  selection?: ?number,
  setSelection?: number => mixed,
|}>;

class ElementProperties extends React.Component<Props> {
  render(): React.Node {
    const style = flattenStyle(this.props.style);
    const selection = this.props.selection;
    let openFileButton;
    const source = this.props.source;
    const {fileName, lineNumber} = source || {};
    if (fileName && lineNumber) {
      const parts = fileName.split('/');
      const fileNameShort = parts[parts.length - 1];
      openFileButton = (
        <TouchableHighlight
          style={styles.openButton}
          onPress={openFileInEditor.bind(null, fileName, lineNumber)}>
          <Text style={styles.openButtonTitle} numberOfLines={1}>
            {fileNameShort}:{lineNumber}
          </Text>
        </TouchableHighlight>
      );
    }
    // Without the `TouchableWithoutFeedback`, taps on this inspector pane
    // would change the inspected element to whatever is under the inspector
    return (
      <TouchableWithoutFeedback>
        <View style={styles.info}>
          <View style={styles.breadcrumb}>
            {mapWithSeparator(
              this.props.hierarchy,
              (hierarchyItem, i): React.MixedElement => (
                <TouchableHighlight
                  key={'item-' + i}
                  style={[styles.breadItem, i === selection && styles.selected]}
                  // $FlowFixMe[not-a-function] found when converting React.createClass to ES6
                  onPress={() => this.props.setSelection(i)}>
                  <Text style={styles.breadItemText}>{hierarchyItem.name}</Text>
                </TouchableHighlight>
              ),
              (i): React.MixedElement => (
                <Text key={'sep-' + i} style={styles.breadSep}>
                  &#9656;
                </Text>
              ),
            )}
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <StyleInspector style={style} />
              {openFileButton}
            </View>
            {<BoxInspector style={style} frame={this.props.frame} />}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  breadSep: {
    fontSize: 8,
    color: 'white',
  },
  breadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  selected: {
    borderColor: 'white',
    borderRadius: 5,
  },
  breadItem: {
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 2,
  },
  breadItemText: {
    fontSize: 10,
    color: 'white',
    marginHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  info: {
    padding: 10,
  },
  openButton: {
    padding: 10,
    backgroundColor: '#000',
    marginVertical: 5,
    marginRight: 5,
    borderRadius: 2,
  },
  openButtonTitle: {
    color: 'white',
    fontSize: 8,
  },
});

module.exports = ElementProperties;
