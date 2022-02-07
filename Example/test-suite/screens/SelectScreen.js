import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeArea } from 'react-native-safe-area-context';

import { getTestModules } from '../TestModules';
import PlatformTouchable from '../components/PlatformTouchable';
import Colors from '../constants/Colors';

function ListItem({ title, onPressItem, selected, id }) {
  function onPress() {
    onPressItem(id);
  }

  const backgroundColor = {
    backgroundColor: selected ? "gray" : "white",
  }

  return (
    <PlatformTouchable onPress={onPress}>
      <View style={[styles.listItem, backgroundColor]}>
        <Text style={styles.label}>{title}</Text>
      </View>
    </PlatformTouchable>
  );
}

export default class SelectScreen extends React.PureComponent {
  state = {
    selected: new Set(),
    modules: [],
  };

  constructor(props) {
    super(props);

    if (global.ErrorUtils) {
      const originalErrorHandler = global.ErrorUtils.getGlobalHandler();

      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // Prevent optionalRequire from failing
        if (
          isFatal &&
          (error.message.includes('Native module cannot be null') ||
            error.message.includes(
              `from NativeViewManagerAdapter isn't exported by @unimodules/react-native-adapter. Views of this type may not render correctly. Exported view managers: `
            ))
        ) {
          console.log('Caught require error');
        } else {
          originalErrorHandler(error, isFatal);
        }
      });
    }
  }

  componentWillUnmount() {
    
  }

  _loadTestModules = () => {
    this.setState({
      modules: getTestModules(),
    });
  };

  componentDidMount() {
    this._loadTestModules();
  }

  _keyExtractor = ({ name }) => name;

  _onPressItem = id => {
    this.setState(state => {
      const selected = new Set(state.selected);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      return { selected };
    });
  };

  _renderItem = ({ item: { name } }) => (
    <ListItem
      id={name}
      onPressItem={this._onPressItem}
      selected={this.state.selected.has(name)}
      title={name}
    />
  );

  _selectAll = () => {
    this.setState(state => {
      if (state.selected.size === this.state.modules.length) {
        return { selected: new Set() };
      }
      return { selected: new Set(this.state.modules.map(item => item.name)) };
    });
  };

  _navigateToTests = () => {
    const { selected } = this.state;
    if (selected.length === 0) {
      Alert.alert('Cannot Run Tests', 'You must select at least one test to run.');
    } else {       
      this.props.navigation.navigate('run', { tests: [...selected]});
      this.setState({ selected: new Set() });
    }
  };

  render() {
    const { selected } = this.state;
    const allSelected = selected.size === this.state.modules.length;
    const buttonTitle = allSelected ? 'Deselect All' : 'Select All';
    return (
      <React.Fragment>
        <FlatList
          data={this.state.modules}
          extraData={this.state}
          keyExtractor={this._keyExtractor}
          renderItem={this._renderItem}
          initialNumToRender={15}
        />
        <Footer
          buttonTitle={buttonTitle}
          canRunTests={selected.size}
          onRun={this._navigateToTests}
          onToggle={this._selectAll}
        />
      </React.Fragment>
    );
  }
}

function Footer({ buttonTitle, canRunTests, onToggle, onRun }) {
  const { bottom, left, right } = useSafeArea();

  const isRunningInDetox = !!global.DETOX;
  const paddingVertical = 16;

  return (
    <View
      style={[
        styles.buttonRow,
        { paddingBottom: isRunningInDetox ? 0 : bottom, paddingLeft: left, paddingRight: right },
      ]}>
      <FooterButton
        style={{ paddingVertical, alignItems: 'flex-start' }}
        title={buttonTitle}
        onPress={onToggle}
      />
      <FooterButton
        style={{ paddingVertical, alignItems: 'flex-end' }}
        title="Run Tests"
        disabled={!canRunTests}
        onPress={onRun}
      />
    </View>
  );
}

function FooterButton({ title, style, ...props }) {
  return (
    <TouchableOpacity
      style={[styles.footerButton, { opacity: props.disabled ? 0.4 : 1 }, style]}
      {...props}>
      <Text style={styles.footerButtonTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const HORIZONTAL_MARGIN = 24;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  footerButtonTitle: {
    fontSize: 18,
    color: Colors.tintColor,
  },
  footerButton: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: HORIZONTAL_MARGIN,
  },
  listItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: HORIZONTAL_MARGIN,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dddddd',
  },
  label: {
    color: 'black',
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dddddd',
    backgroundColor: 'white',
  },
  contentContainerStyle: {
    paddingBottom: 128,
  },
});
