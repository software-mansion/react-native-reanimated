import type { PropsWithChildren, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { spacing } from '../../theme';
import { Portal } from '@gorhom/portal';

export interface ActionSheetOption {
  key: string;
  onPress: () => void;
  render: () => ReactNode;
}

type LayoutMeasurements = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DropdownState = {
  isOpen: boolean;
  toggleMeasurements: (LayoutMeasurements & { sticky?: boolean }) | null;
};

export type ActionSheetDropdownStyleOptions = {
  alignment?: 'left' | 'right';
  sticky?: boolean;
  offsetX?: number;
  offsetY?: number;
  dropdownMaxHeight?: number;
  dropdownZIndex?: number;
};

type ActionSheetDropdownProps = PropsWithChildren<{
  options: ActionSheetOption[];
  styleOptions?: ActionSheetDropdownStyleOptions & {
    backdropOpacity?: number;
    dropdownStyle?: StyleProp<ViewStyle>;
  };
  onOpen?: () => void;
  onClose?: () => void;
}>;

export default function ActionSheetDropdown({
  children,
  styleOptions,
  onOpen,
  onClose,
  ...contentProps
}: ActionSheetDropdownProps): JSX.Element {
  const containerRef = useRef<View>(null);
  const [{ isOpen, toggleMeasurements }, setState] = useState<DropdownState>({
    isOpen: false,
    toggleMeasurements: null,
  });

  const openDropdown = (): void => {
    onOpen?.();

    const containerNode = containerRef?.current;

    if (containerNode) {
      containerNode.measureInWindow((x, y, width, height) => {
        setState({
          isOpen: true,
          toggleMeasurements: {
            x,
            y,
            width,
            height,
            sticky: styleOptions?.sticky,
          },
        });
      });
    }
  };

  const closeDropdown = (): void => {
    onClose?.();
    setState({ isOpen: false, toggleMeasurements: null });
  };

  return (
    <>
      <Pressable onPress={openDropdown}>
        {/* collapsable property prevents removing view on Android. Without this property we were
        getting undefined in measureInWindow callback. (https://reactnative.dev/docs/view.html#collapsable-android) */}
        <View ref={containerRef} collapsable={false}>
          {children}
        </View>
      </Pressable>

      <Portal>
        {isOpen && toggleMeasurements && (
          <>
            <Backdrop handleClose={closeDropdown} />
            <DropdownContent
              {...contentProps}
              style={styleOptions?.dropdownStyle}
              alignment={styleOptions?.alignment}
              offsetX={styleOptions?.offsetX}
              offsetY={styleOptions?.offsetY}
              dropdownMaxHeight={styleOptions?.dropdownMaxHeight}
              handleClose={closeDropdown}
              toggleMeasurements={toggleMeasurements}
            />
          </>
        )}
      </Portal>
    </>
  );
}

type DropdownContentProps = {
  options: ActionSheetOption[];
  toggleMeasurements: LayoutMeasurements;
  alignment?: 'left' | 'right';
  offsetX?: number;
  offsetY?: number;
  dropdownMaxHeight?: number;
  style?: StyleProp<ViewStyle>;
  handleClose?: () => void;
};

function DropdownContent({
  options,
  alignment = 'left',
  toggleMeasurements,
  offsetX = 0,
  offsetY = spacing.xxs,
  dropdownMaxHeight,
  handleClose,
  style,
}: DropdownContentProps): JSX.Element {
  const [overflowsContainer, setOverflowsContainer] = useState(false);
  const windowDimensions = Dimensions.get('window');

  const containerProps = useMemo(() => {
    if (alignment === 'left') {
      return {
        left: toggleMeasurements.x + offsetX,
        maxWidth: windowDimensions.width - toggleMeasurements.x - spacing.sm,
      };
    }
    return {
      right:
        windowDimensions.width -
        (toggleMeasurements.x + toggleMeasurements.width) -
        offsetX,
      maxWidth: toggleMeasurements.x + toggleMeasurements.width - spacing.sm,
    };
  }, [alignment, windowDimensions.width, toggleMeasurements, offsetX]);

  const maxHeight =
    windowDimensions.height -
    toggleMeasurements.y -
    toggleMeasurements.height -
    spacing.sm;

  const dropdownStyle: ViewStyle = {
    maxHeight,
    position: 'absolute',
    top: toggleMeasurements.y + toggleMeasurements.height + offsetY,
    ...containerProps,
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="box-none"
      style={dropdownStyle}>
      <View style={[{ maxHeight: dropdownMaxHeight }, style]}>
        <ScrollView
          scrollEnabled={overflowsContainer}
          showsVerticalScrollIndicator={false}>
          <View
            onLayout={({
              nativeEvent: {
                layout: { height },
              },
            }) => {
              setOverflowsContainer(height > maxHeight);
            }}>
            {options.map(({ key, onPress, render }: ActionSheetOption) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  onPress();
                  handleClose?.();
                }}>
                {render()}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

type BackdropProps = {
  handleClose?: () => void;
};

function Backdrop({ handleClose }: BackdropProps): JSX.Element {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
