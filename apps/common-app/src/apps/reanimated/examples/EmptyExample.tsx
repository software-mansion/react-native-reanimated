import React from 'react';
import { StyleSheet, Text, TurboModuleRegistry, View } from 'react-native';
import { initializeNetworking, runOnUI } from 'react-native-worklets';
import axios from 'axios';

export default function EmptyExample() {
  // console.log('BlobModule', TurboModuleRegistry.get('BlobModule'));
  // console.log(
  //   'BlobModule keys',
  //   Object.keys(TurboModuleRegistry.get('BlobModule'))
  // );
  // console.log(
  //   'BlobModule prototype',
  //   Object.getPrototypeOf(TurboModuleRegistry.get('BlobModule'))
  // );
  // console.log(
  //   'BlobModule prototype keys',
  //   Object.keys(Object.getPrototypeOf(TurboModuleRegistry.get('BlobModule')))
  // );
  // console.log(
  //   'BlobModule prototype has dupa',
  //   'dupa' in Object.getPrototypeOf(TurboModuleRegistry.get('BlobModule'))
  // );

  runOnUI(initializeNetworking)();

  // try {
  //   fetch('https://jsonplaceholder.typicode.com/posts/1')
  //     .then((response) => {
  //       console.log('response received');
  //       return response.json().then((data) => {
  //         console.log('Fetched data:', data);
  //       });
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching data:', error);
  //     });
  // } catch (e) {
  //   console.error('Error in worklet fetch:', e);
  // }

  runOnUI(() => {
    'worklet';
    // globalThis._log('hello');
    console.log('Hello from worklet!');
    // globalThis.setImmediate = globalThis.requestAnimationFrame;
    console.log('fetching');
    console.log('globalThis.fetch', globalThis.fetch.toString());
    // globalThis._log('fetching');
    // globalThis.setTimeout = (callback: () => void, delay: number) => {
    //   console.log('setTimeout called with delay:', delay);
    //   globalThis.requestAnimationFrame(callback);
    // };
    try {
      fetch('https://jsonplaceholder.typicode.com/posts/1')
        .then((response) => {
          console.log('response received');
          return response.json().then((data) => {
            console.log(globalThis._WORKLET, 'Fetched data:', data);
          });
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
        });
      axios({
        method: 'post',
        url: 'https://jsonplaceholder.typicode.com/posts',
        data: {
          title: 'foo',
          body: 'bar',
          userId: 1,
        },
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
          'X-Custom-Header': 'CustomValue',
        },
        timeout: 5000,
        params: {
          debug: true,
        },
        responseType: 'json',
      })
        .then((response) => {
          console.log('Advanced Axios response:', response.data);
        })
        .catch((error) => {
          console.error('Advanced Axios error:', error);
        });
    } catch (e) {
      console.error('Error in worklet fetch:', e);
    }
  })();

  // runOnUI(() => {
  //   'worklet';

  //   function getAllProperties(obj) {
  //     let props = [];

  //     while (obj) {
  //       props = props.concat(Object.getOwnPropertyNames(obj));
  //       obj = Object.getPrototypeOf(obj);
  //     }

  //     // This includes duplicates if there are overridden properties in the prototype chain
  //     return props;
  //   }

  //   const props = getAllProperties(globalThis);
  //   console.log('Global properties:', props);
  // })();

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
