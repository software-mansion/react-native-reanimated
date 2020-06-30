import React, { Component } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

let scrollYPos = 0;

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      screenHeight: Dimensions.get('window').height,      
      screenWidth: Dimensions.get('window').width,
    };
  }

  scrollToB = () => {
    
    scrollYPos = this.state.screenHeight * 1;
    this.scroller.scrollTo({x: 0, y: scrollYPos});
  };
  scrollToC = () => {
    scrollYPos = this.state.screenHeight * 2;
    this.scroller.scrollTo({x: 0, y: scrollYPos});
  };
  scrollToTop = () => {
    this.scroller.scrollTo({x: 0, y: 0});
  };

  render() {
    return (
      <ScrollView style={styles.container} ref={(scroller) => {this.scroller = scroller}}>
        <View style={[styles.screen, styles.screenA]}>
          <Text style={styles.letter}>A</Text>
          <TouchableOpacity
            onPress={this.scrollToB}
          >
            <View style={styles.scrollButton}>
              <Text style={styles.scrollButtonText}>Scroll to B</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[styles.screen, styles.screenB]}>
          <Text style={styles.letter}>B</Text>
          <TouchableOpacity
            onPress={this.scrollToC}
          >
            <View style={styles.scrollButton}>
              <Text style={styles.scrollButtonText}>Scroll to C</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[styles.screen, styles.screenC]}>
          <Text style={styles.letter}>C</Text>
          <TouchableOpacity
            onPress={this.scrollToTop}
          >
            <View style={styles.scrollButton}>
              <Text style={styles.scrollButtonText}>Scroll to Top</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    backgroundColor: 'yellow',
    flexDirection: 'column', 
    height: Dimensions.get('window').height,
    justifyContent: 'center'
  },
  screenA: {
    backgroundColor: '#F7CAC9',
  },
  screenB: {
    backgroundColor: '#92A8D1',
  },
  screenC: {
    backgroundColor: '#88B04B',
  },
  letter: {
    color: '#000',
    fontSize: 60,
    textAlign: 'center'
  },
  scrollButton: {
    alignSelf: 'center',
    backgroundColor: 'white',
    height: 50,
    marginTop: 50,
    width: 150,
  },
  scrollButtonText: {
    padding: 20,
    textAlign: 'center',
  },
});