import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { colors, radius, spacing, text } from '../../theme';

type RouteCardProps = PropsWithChildren<{
  title: string;
  route: string;
}>;

export type RouteCardComponent = (
  props: Omit<RouteCardProps, 'children'>
) => JSX.Element;

export default function RouteCard({ children, route, title }: RouteCardProps) {
  const navigation = useNavigation();
  const [dimensions, setDimensions] = useState({ height: 0, width: 0 });

  return (
    <TouchableOpacity
      activeOpacity={0.5}
      style={styles.card}
      onPress={() => {
        navigation.navigate(route as never);
      }}>
      {children && (
        <View>
          {children}
          {/* Gradient overlay */}
          <View
            style={[styles.gradient, StyleSheet.absoluteFill]}
            onLayout={(e) => {
              setDimensions({
                height: e.nativeEvent.layout.height,
                width: e.nativeEvent.layout.width,
              });
            }}>
            <Svg height={dimensions.height} width={dimensions.width}>
              <Defs>
                <LinearGradient
                  id="horizontal-gradient"
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0">
                  <Stop
                    offset="0.25"
                    stopColor={colors.background1}
                    stopOpacity="0"
                  />
                  <Stop
                    offset="0.95"
                    stopColor={colors.background1}
                    stopOpacity="1"
                  />
                </LinearGradient>
              </Defs>

              <Rect
                fill="url(#horizontal-gradient)"
                height="100%"
                width="100%"
              />
            </Svg>
          </View>
        </View>
      )}
      <View style={styles.footer}>
        <Text style={[text.label1, styles.title]}>{title}</Text>
        <FontAwesomeIcon color={colors.foreground3} icon={faChevronRight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background1,
    borderRadius: radius.md,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gradient: {
    marginBottom: -spacing.md,
    marginHorizontal: -spacing.lg,
  },
  title: {
    color: colors.foreground1,
  },
});
