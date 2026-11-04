import type React from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';

export const AndroidDrawerLayout: React.ComponentType<
  ViewProps & { drawerWidth?: number }
> = View;
