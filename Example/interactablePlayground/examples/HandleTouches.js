import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  ListView,
  TouchableOpacity,
  Text,
} from 'react-native';
import Interactable from '../../Interactable';

export default class HandleTouches extends Component {
  constructor() {
    super();
    const ds = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2,
    });
    this.state = {
      dataSource: ds.cloneWithRows([
        'card1',
        'card2',
        'card3',
        'card4',
        'card5',
        'card6',
        'card7',
        'card8',
      ]),
    };
  }
  render() {
    return (
      <ListView
        contentContainerStyle={styles.container}
        dataSource={this.state.dataSource}
        renderRow={this.renderRow.bind(this)}
      />
    );
  }
  renderRow(data) {
    return (
      <Interactable.View
        horizontalOnly={true}
        snapPoints={[{ x: 360 }, { x: 0 }, { x: -360 }]}>
        <TouchableOpacity style={styles.card} onPress={this.onCardPress}>
          <TouchableOpacity
            style={styles.button}
            onPress={this.onButtonPress.bind(this, 'A')}>
            <Text style={{ textAlign: 'center' }}>Button A</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={this.onButtonPress.bind(this, 'B')}>
            <Text style={{ textAlign: 'center' }}>Button B</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Interactable.View>
    );
  }
  onCardPress() {
    alert('Card was pressed');
  }
  onButtonPress(type) {
    alert(`Button ${type} was pressed`);
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'white',
  },
  card: {
    width: 300,
    height: 180,
    backgroundColor: 'red',
    borderRadius: 8,
    marginVertical: 6,
  },
  button: {
    width: 80,
    height: 40,
    marginLeft: 30,
    marginTop: 30,
    justifyContent: 'center',
    backgroundColor: 'purple',
  },
});
