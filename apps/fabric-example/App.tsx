import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SortableList from './src/SortableList';

export default function App() {
  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <SortableList />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </>
  );
}
