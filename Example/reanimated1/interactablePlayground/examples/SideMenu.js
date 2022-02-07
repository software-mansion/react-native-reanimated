import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Button,
  Dimensions,
} from 'react-native';
import Interactable from '../../Interactable';

const Screen = Dimensions.get('window');
const SideMenuWidth = 280;
const RemainingWidth = Screen.width - SideMenuWidth;

export default class SideMenu extends Component {
  render() {
    return (
      <View style={styles.container}>
        <View style={styles.sideMenuContainer} pointerEvents="box-none">
          <Interactable.View
            ref="menuInstance"
            horizontalOnly={true}
            snapPoints={[{ x: 0 }, { x: -SideMenuWidth }]}
            boundaries={{ right: RemainingWidth / 2 }}
            initialPosition={{ x: -SideMenuWidth }}>
            <View style={styles.sideMenu}>
              <Text style={styles.sideMenuTitle}>Menu</Text>
              <Button
                title="Button 1"
                onPress={() => alert('Button 1 pressed')}
              />
              <Button
                title="Button 2"
                onPress={() => alert('Button 2 pressed')}
              />
              <Button
                title="Button 3"
                onPress={() => alert('Button 3 pressed')}
              />
              <Button title="Close" onPress={this.onClosePress.bind(this)} />
            </View>
          </Interactable.View>
        </View>

        <View style={styles.header}>
          <TouchableOpacity onPress={this.onMenuPress.bind(this)}>
            <Image
              style={styles.menuIcon}
              source={require('../assets/icon-menu.png')}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Side Menu Example</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.content}>Some Content Here</Text>
        </View>
      </View>
    );
  }
  onMenuPress() {
    this.refs['menuInstance'].setVelocity({ x: 2000 });
  }
  onClosePress() {
    this.refs['menuInstance'].setVelocity({ x: -2000 });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    backgroundColor: 'white',
  },
  sideMenuContainer: {
    position: 'absolute',
    top: 0,
    left: -RemainingWidth,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 1002,
  },
  sideMenu: {
    left: 0,
    width: Screen.width,
    paddingLeft: RemainingWidth,
    flex: 1,
    backgroundColor: '#aaa',
    paddingTop: 80,
  },
  sideMenuTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    height: 60,
    paddingLeft: 20,
    flexDirection: 'row',
    backgroundColor: 'red',
    alignItems: 'center',
    zIndex: 1001,
  },
  body: {
    flex: 1,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    width: 30,
    height: 30,
  },
  headerTitle: {
    marginLeft: 30,
    color: 'white',
    fontSize: 20,
  },
  content: {
    fontSize: 18,
  },
});
