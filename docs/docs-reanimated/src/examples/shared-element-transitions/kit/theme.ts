import { useColorMode } from '@docusaurus/theme-common';

export const palette = {
  purple: '#b58df1',
  yellow: '#ffe780',
  red: '#fa7f7c',
  green: '#82cab2',
  blue: '#87cce8',
  pink: '#ffa3a1',
  mint: '#b1dfd0',
  navy: '#001a72',
};

export interface DemoTheme {
  dark: boolean;
  bezel: string;
  bezelEdge: string;
  screen: string;
  surface: string;
  line: string;
  text: string;
  subtle: string;
  accent: string;
  dim: string;
  source: string;
  target: string;
  mono: string;
}

const light: DemoTheme = {
  dark: false,
  bezel: '#16182a',
  bezelEdge: '#3a3d52',
  screen: '#ffffff',
  surface: '#f2f3fb',
  line: '#e3e6f5',
  text: '#001a72',
  subtle: '#6676aa',
  accent: '#782aeb',
  dim: 'rgba(0, 10, 40, 0.18)',
  source: '#782aeb',
  target: '#e0563f',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const dark: DemoTheme = {
  dark: true,
  bezel: '#0b0c14',
  bezelEdge: '#4a4f6a',
  screen: '#191b28',
  surface: '#232637',
  line: '#2e3247',
  text: '#f8f9ff',
  subtle: '#919fcf',
  accent: '#b58df1',
  dim: 'rgba(0, 0, 0, 0.45)',
  source: '#c49ffe',
  target: '#ffa3a1',
  mono: light.mono,
};

export function useDemoTheme(): DemoTheme {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? dark : light;
}
