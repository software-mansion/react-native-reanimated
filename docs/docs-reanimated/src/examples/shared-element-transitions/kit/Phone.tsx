import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useDemoTheme } from './theme';

const BEZEL = 7;
const OUTER_RADIUS = 40;

export const PHONE_WIDTH = 236;
export const PHONE_HEIGHT = 480;
export const SCREEN_WIDTH = PHONE_WIDTH - 2 * BEZEL;
export const SCREEN_HEIGHT = PHONE_HEIGHT - 2 * BEZEL;
export const STATUS_BAR_HEIGHT = 30;

interface PhoneProps {
  children: React.ReactNode;
  statusBarTint?: 'auto' | 'light';
}

export function Phone({ children, statusBarTint = 'auto' }: PhoneProps) {
  const theme = useDemoTheme();
  const statusColor = statusBarTint === 'light' ? '#ffffff' : theme.text;

  return (
    <View
      style={[
        styles.bezel,
        { backgroundColor: theme.bezel, borderColor: theme.bezelEdge },
      ]}>
      <View style={[styles.screen, { backgroundColor: theme.screen }]}>
        {children}
        <View style={styles.statusBar}>
          <Text style={[styles.time, { color: statusColor }]}>9:41</Text>
          <View style={[styles.island, { backgroundColor: theme.bezel }]} />
          <View style={styles.indicators}>
            {[5, 7, 9].map((height) => (
              <View
                key={height}
                style={[styles.bar, { height, backgroundColor: statusColor }]}
              />
            ))}
            <View style={[styles.battery, { borderColor: statusColor }]}>
              <View
                style={[styles.batteryLevel, { backgroundColor: statusColor }]}
              />
            </View>
          </View>
        </View>
        <View style={[styles.homeIndicator, { backgroundColor: theme.text }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bezel: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    padding: BEZEL - 1,
    borderWidth: 1,
    borderRadius: OUTER_RADIUS,
    boxShadow: '0px 18px 40px rgba(0, 16, 64, 0.22)',
    userSelect: 'none',
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: OUTER_RADIUS - BEZEL,
  },
  statusBar: {
    position: 'absolute',
    pointerEvents: 'none',
    top: 0,
    left: 0,
    right: 0,
    height: STATUS_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 2,
    zIndex: 100,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    width: 40,
  },
  island: {
    width: 62,
    height: 18,
    borderRadius: 9,
  },
  indicators: {
    width: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1,
  },
  battery: {
    width: 17,
    height: 9,
    marginLeft: 3,
    padding: 1,
    borderWidth: 1,
    borderRadius: 3,
  },
  batteryLevel: {
    flex: 1,
    borderRadius: 1,
  },
  homeIndicator: {
    position: 'absolute',
    pointerEvents: 'none',
    bottom: 6,
    alignSelf: 'center',
    width: 78,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
    zIndex: 100,
  },
});
