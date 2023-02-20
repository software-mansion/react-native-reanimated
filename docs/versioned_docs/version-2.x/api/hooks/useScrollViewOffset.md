---
id: useScrollViewOffset
title: useScrollViewOffset
sidebar_label: useScrollViewOffset
---

:::tip

useScrollViewOffset is available since v2.11.0

:::

This hook allows you to create animations based on the offset of a `ScrollView`.
The hook automatically detects if the `ScrollView` is horizontal or vertical.

```js
useScrollViewOffset(aref: RefObject<Animated.ScrollView>) => [SharedValue<number>]
```

### Arguments

#### `aref` [RefObject&lt;Animated.ScrollView&gt;]

An Animated reference to a `ScrollView`. The reference should be passed to the
appropriate `ScrollView` in the `ref` prop.

### Returns

A shared value which holds the current offset of the `ScrollView`.

## Example

```js
function ScrollViewOffsetExample() {
  const aref = useAnimatedRef<Animated.ScrollView>();
  const scrollHandler = useScrollViewOffset(aref);

  useAnimatedStyle(() => {
    console.log(scrollHandler.value);
    return {};
  });

  return (
    <>
      <View style={styles.positionView}>
        <Text>Test</Text>
      </View>
      <View style={styles.divider} />
      <Animated.ScrollView
        ref={aref}
        scrollEventThrottle={16}
        style={styles.scrollView}>
        {[...Array(100)].map((_, i) => (
          <Text key={i} style={styles.text}>
            {i}
          </Text>
        ))}
      </Animated.ScrollView>
    </>
  );
}
```
