import React from 'react';
import {Text, View, FlatList, StyleSheet} from 'react-native';
import Basic from './Basic';
import WithDrag from './WithDrag';
import AnimatedBounds from './AnimatedBounds';
import InterpolateColorsExample from './InterpolateColorsExample';

const examples = [
  Basic,
  WithDrag,
  AnimatedBounds,
  InterpolateColorsExample,
].map(v => ({
  key: v.displayName,
  title: v.displayName,
  Component: v,
}));

class Item extends React.Component {
  render() {
    const item = this.props.item;
    const Comp = this.props.item.Component;

    return (
      <View style={styles.button}>
        <Text>{item.title}</Text>
        <Comp />
      </View>
    );
  }
}

class MainScreen extends React.Component {
  static navigationOptions = {
    title: 'Interpolation Examples',
  };
  renderItem = props => <Item {...props} />;
  render() {
    return (
      <FlatList
        style={styles.list}
        data={examples}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={this.renderItem}
      />
    );
  }
}

const ItemSeparator = () => <View style={styles.separator} />;

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
  },
  button: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
});

export default MainScreen;
