import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import Interactable from '../../Interactable';

export default class TouchesInside extends Component {
  constructor(props) {
    super(props);
    this.state = {
      vertical: true,
      dragEnabled: true,
      language: 'java',
      switch: true,
    };
  }
  render() {
    return (
      <View style={styles.container}>
        <View style={styles.direction}>
          <Text style={{ marginRight: 10 }}>Vertical: </Text>
          <Switch
            value={this.state.vertical}
            onValueChange={value => this.setState({ vertical: value })}
          />
          <Text style={{ marginRight: 10, marginLeft: 20 }}>Can drag: </Text>
          <Switch
            value={this.state.dragEnabled}
            onValueChange={value => this.setState({ dragEnabled: value })}
          />
        </View>

        <Interactable.View
          verticalOnly={this.state.vertical}
          horizontalOnly={!this.state.vertical}
          dragEnabled={this.state.dragEnabled}
          snapPoints={[{ y: 0 }]}
          style={{ width: 300, height: 500, padding: 20, borderRadius: 10 }}>
          <Text>Hello world</Text>

          <ActivityIndicator
            animating={true}
            size="large"
            style={{ marginBottom: 10 }}
          />

          <Image
            style={{ width: 220, height: 100, marginBottom: 10 }}
            source={{
              uri:
                'https://static.wixstatic.com/media/e758eb_729674838e084f49bc75db035ed286a6~mv2.jpg/v1/fill/w_300,h_160,al_c,q_80,usm_0.66_1.00_0.01/e758eb_729674838e084f49bc75db035ed286a6~mv2.jpg',
            }}
          />

          <TextInput
            style={{
              height: 40,
              backgroundColor: 'white',
              padding: 5,
              borderColor: 'black',
              borderWidth: 1,
              marginBottom: 10,
            }}
          />

          <View
            pointerEvents="none"
            style={{
              width: 220,
              height: 75,
              backgroundColor: 'blue',
              marginBottom: 10,
            }}
          />
        </Interactable.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  direction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
});
