import React, { Component } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import ProgressBar from './ProgressBar';

export default class Progressable extends Component {
  static navigationOptions = {
    title: 'ProgressBar Example',
  };
  state = {
    progress: 0,
    visible: true,
  };

  fetchData = () => {
    let progress = 0;
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setInterval(() => {
      this.setState({
        progress,
      });
      progress += 0.1;
      if (progress > 1) {
        clearInterval(this.timeout);
      }
    }, 1000);
  };

  componentDidMount() {
    this.fetchData();
  }

  render() {
    return (
      <View style={styles.container}>
        {this.state.visible && (
          <ProgressBar progress={this.state.progress} style={{ margin: 20 }} />
        )}
        <Button
          onPress={() => {
            this.setState({ progress: 0 });
            this.fetchData();
          }}
          title="RESET"
        />
        <Button
          onPress={() => this.setState(prev => ({ visible: !prev.visible }))}
          title="TOGGLE VISIBILITY"
        />
      </View>
    );
  }
}

const BOX_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: '#F5FCFF',
    alignSelf: 'center',
    backgroundColor: 'plum',
    margin: BOX_SIZE / 2,
  },
});
