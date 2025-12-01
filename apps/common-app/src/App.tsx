import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import TransformAnimations from './components/TransformAnimations';
import BorderAnimations from './components/BorderAnimations';
import MarginAnimations from './components/MarginAnimations';

type Screen = 'home' | 'transform' | 'border' | 'margin';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const renderHomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <Text style={styles.title}>React Native Reanimated</Text>
        <Text style={styles.subtitle}>Animation Examples</Text>

        <View style={styles.categoryContainer}>
          <TouchableOpacity
            style={[styles.categoryButton, styles.transformButton]}
            onPress={() => setCurrentScreen('transform')}>
            <Text style={styles.categoryTitle}>🔄 Transform</Text>
            <Text style={styles.categoryDescription}>
              Scale, rotate, translate, skew, opacity, background, shadows
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryButton, styles.borderButton]}
            onPress={() => setCurrentScreen('border')}>
            <Text style={styles.categoryTitle}>🎨 Borders</Text>
            <Text style={styles.categoryDescription}>
              Border radius, width, colors, and individual sides
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryButton, styles.marginButton]}
            onPress={() => setCurrentScreen('margin')}>
            <Text style={styles.categoryTitle}>📏 Margins & Padding</Text>
            <Text style={styles.categoryDescription}>
              Margin, padding animations with wave effects
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case 'transform':
        return <TransformAnimations onBack={() => setCurrentScreen('home')} />;
      case 'border':
        return <BorderAnimations onBack={() => setCurrentScreen('home')} />;
      case 'margin':
        return <MarginAnimations onBack={() => setCurrentScreen('home')} />;
      default:
        return renderHomeScreen();
    }
  };

  return <View style={styles.appContainer}>{renderScreen()}</View>;
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  homeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  categoryContainer: {
    width: '100%',
    maxWidth: 400,
  },
  categoryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  transformButton: {
    borderLeftColor: '#3498db',
  },
  borderButton: {
    borderLeftColor: '#e74c3c',
  },
  marginButton: {
    borderLeftColor: '#f39c12',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
});
