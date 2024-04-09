---
slug: marquee
title: Marquee
---

A marquee is an element used to display scrolling content horizontally within a confined space. It's commonly seen in applications to information such as news tickers, advertisements, or any content that needs continuous display within a limited area.

import Marquee from '@site/static/examples/Marquee';
import MarqueeSrc from '!!raw-loader!@site/static/examples/Marquee';
import ExampleVideo from '@site/src/components/ExampleVideo';

<InteractiveExample src={MarqueeSrc} component={<Marquee />} />

Now, let's understand how this example works:

The **MeasureElement** component measures the width of its children and passes this information to its parent component, Marquee.

<samp id="Marquee">Marquee</samp>

```js
const MeasureElement = ({ onLayout, children }) => (
  <Animated.ScrollView
    horizontal
    style={marqueeStyles.hidden}
    pointerEvents="box-none">
    <View onLayout={(ev) => onLayout(ev.nativeEvent.layout.width)}>
      {children}
    </View>
  </Animated.ScrollView>
);
```

<ExampleVideo
sources={{
    android: "/react-native-reanimated/recordings/examples/marquee_android.mov",
    ios: "/react-native-reanimated/recordings/examples/marquee_ios.mov"
  }}
/>

The `useFrameCallback` hook is utilized in this code to execute animation logic on each frame. It is located inside **ChildrenScroller** component that manages the scrolling animation by updating the offset value. It determines the horizontal translation of the child components, creates clones of the children and animates them horizontally based on the specified duration.

<samp id="Marquee">Marquee</samp>

```js
const ChildrenScroller = ({
  duration,
  childrenWidth,
  parentWidth,
  reverse,
  children,
}) => {
  const offset = useSharedValue(0);
  const coeff = useSharedValue(reverse ? 1 : -1);

  React.useEffect(() => {
    coeff.value = reverse ? 1 : -1;
  }, [reverse]);

  // highlight-start
  useFrameCallback((i) => {
    offset.value +=
      (coeff.value * ((i.timeSincePreviousFrame ?? 1) * childrenWidth)) /
      duration;
    offset.value = offset.value % childrenWidth;
  }, true);
  // highlight-end

  const count = Math.round(parentWidth / childrenWidth) + 2;
  const renderChild = (index) => (
    <TranslatedElement
      key={`clone-${index}`}
      index={index}
      offset={offset}
      childrenWidth={childrenWidth}>
      {children}
    </TranslatedElement>
  );

  return <Cloner count={count} renderChild={renderChild} />;
};
```

The **Marquee** component serves as the main orchestrator of the marquee effect. It calculates necessary dimensions, renders child components within a container, and coordinates the animation by utilizing the ChildrenScroller component.

<samp id="Marquee">Marquee</samp>

```js
const Marquee = ({ duration = 2000, reverse = false, children, style }) => {
  const [parentWidth, setParentWidth] = React.useState(0);
  const [childrenWidth, setChildrenWidth] = React.useState(0);

  return (
    <View
      style={style}
      onLayout={(ev) => {
        setParentWidth(ev.nativeEvent.layout.width);
      }}
      pointerEvents="box-none">
      <View style={marqueeStyles.row} pointerEvents="box-none">
        <MeasureElement onLayout={setChildrenWidth}>{children}</MeasureElement>

        {childrenWidth > 0 && parentWidth > 0 && (
          <ChildrenScroller
            duration={duration}
            parentWidth={parentWidth}
            childrenWidth={childrenWidth}
            reverse={reverse}>
            {children}
          </ChildrenScroller>
        )}
      </View>
    </View>
  );
};
```
