import type React from 'react';
import type { ViewProps } from 'react-native';

export const AndroidDrawerLayout = (
  require('react-native/Libraries/Components/DrawerAndroid/AndroidDrawerLayoutNativeComponent') as {
    default: React.ComponentType<ViewProps & { drawerWidth?: number }>;
  }
).default;
