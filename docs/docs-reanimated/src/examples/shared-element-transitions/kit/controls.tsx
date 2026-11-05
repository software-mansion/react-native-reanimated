import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Slider, Switch, ToggleButton, ToggleButtonGroup } from '@mui/material';

import { useDemoTheme } from './theme';

const WIDE_LAYOUT = 600;

interface DemoLayoutProps {
  width?: number;
  phone: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function DemoLayout({
  width = 0,
  phone,
  children,
  footer,
}: DemoLayoutProps) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const wide = Math.max(width, measuredWidth) >= WIDE_LAYOUT;
  return (
    <View
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      style={styles.layout}>
      <View style={[styles.main, wide && styles.mainWide]}>
        <View style={styles.phoneColumn}>{phone}</View>
        {children && (
          <View style={[styles.controls, wide && styles.controlsWide]}>
            {children}
          </View>
        )}
      </View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

interface ControlProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Control({ label, hint, children }: ControlProps) {
  const theme = useDemoTheme();
  return (
    <View style={styles.control}>
      <View style={styles.controlHeader}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {hint !== undefined && (
          <Text style={[styles.hint, { color: theme.subtle }]}>{hint}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, value, onChange, disabled }: ToggleProps) {
  const theme = useDemoTheme();
  return (
    <View style={[styles.toggle, disabled && styles.disabled]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Switch
        size="small"
        color="secondary"
        checked={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </View>
  );
}

interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: NoInfer<T>) => void;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: SegmentedProps<T>) {
  const group = (
    <ToggleButtonGroup
      exclusive
      size="small"
      color="secondary"
      value={value}
      disabled={disabled}
      onChange={(_, next: T | null) => next !== null && onChange(next)}
      sx={segmentedStyling}>
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
  return label ? <Control label={label}>{group}</Control> : group;
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
  disabled,
}: SliderControlProps) {
  return (
    <Control label={label} hint={format(value)}>
      <Slider
        size="small"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(_, next) => onChange(next as number)}
        sx={sliderStyling}
      />
    </Control>
  );
}

export function CodeLine({ children }: { children: string }) {
  const theme = useDemoTheme();
  return (
    <ScrollView
      horizontal
      style={[
        styles.code,
        { backgroundColor: theme.surface, borderColor: theme.line },
      ]}
      contentContainerStyle={styles.codeContent}>
      <Text
        style={[
          styles.codeText,
          { color: theme.text, fontFamily: theme.mono },
        ]}>
        {children}
      </Text>
    </ScrollView>
  );
}

export function Caption({ children }: { children: React.ReactNode }) {
  const theme = useDemoTheme();
  return (
    <Text style={[styles.caption, { color: theme.subtle }]}>{children}</Text>
  );
}

const segmentedStyling = {
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    textTransform: 'none',
    fontSize: 12,
    lineHeight: 1.2,
    paddingX: 1.25,
    paddingY: 0.6,
    color: 'text.secondary',
    borderColor: 'var(--swm-border)',
    borderRadius: 0,
  },
};

const sliderStyling = {
  color: 'var(--swm-interactive-slider)',
  '& .MuiSlider-rail': {
    color: 'var(--swm-interactive-slider-rail)',
    opacity: 1,
  },
};

const styles = StyleSheet.create({
  layout: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  main: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  footer: {
    width: '100%',
    maxWidth: 640,
  },
  mainWide: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  phoneColumn: {
    alignItems: 'center',
  },
  controls: {
    width: '100%',
    maxWidth: 340,
    gap: 14,
  },
  controlsWide: {
    width: 340,
  },
  control: {
    gap: 6,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  code: {
    flexGrow: 0,
    borderWidth: 1,
  },
  codeContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeText: {
    fontSize: 11,
    lineHeight: 16,
  },
  caption: {
    fontSize: 13,
    textAlign: 'center',
  },
});
