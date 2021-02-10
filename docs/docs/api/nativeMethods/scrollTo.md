---
id: scrollTo
title: scrollTo
sidebar_label: scrollTo
---

Provides synchronous scroll on the UI thread to a given offset using an animated ref to a scroll view. This allows performing smooth scrolling without lags(which might occur when it would be asynchronous and based on a lot of events).

This function is implemented on native platforms only. On the web it's sufficient to use a standard version of the `scrollTo` which comes with a `ScrollView` component(it's [here](https://github.com/facebook/react-native/blob/aebccd3f923c920bd85fb9e5fbdd2a8a75d3ad3d/Libraries/Components/ScrollView/ScrollView.js#L834)). In such a case it should be invoked in the following way:

```javascript
const aref = useAnimatedRef();
aref.current.scrollTo({ x, y });
```

### Arguments

#### `animatedRef`

The product of [`useAnimatedRef`](../useAnimatedRef) which is a Reanimated's extension of a standard React's ref(delivers view tag on the UI thread).

### Returns

void

### Example

```js
const Comp = () => {
  const aref = useAnimatedRef();
  const scroll = useSharedValue(0);

  useDerivedValue(() => {
    scrollTo(aref, 0, scroll.value * 100, true);
  });

  const items = Array.from(Array(10).keys());

  return (
    <View>
      <Button
        title="scroll down"
        onPress={() => {
          scroll.value = scroll.value + 1;
          if (scroll.value >= 10) scroll.value = 0;
        }}
      />
      <View style={{ width: 120, height: 200, backgroundColor: 'green' }}>
        <ScrollView
          ref={aref}
          style={{ backgroundColor: 'orange', width: 120 }}>
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                backgroundColor: 'white',
                width: 100,
                height: 100,
                margin: 10,
              }}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
```
