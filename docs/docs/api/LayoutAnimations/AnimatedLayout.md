---
id: animatedLayout
title: <AnimatedLayout>
sidebar_label: <AnimatedLayout>
---
The component is responsible for observing changes in its subtree. There is no need to nest one `AnimatedLayout` in another one because the higher one would already watch the subtree of the lower one. You can treat it as a `View` component. `AnimatedLayout` manages all its descendants' animations while it's mounting and unmounting as well. 

## Example
```js
    import { AnimatedLayout } from 'react-native-reanimated';
    
    function CustomFunctionComponent() {

        return (
            <AnimatedLayout>
                // watched subtree
            </AnimatedLayout>
        );
    }
```

```js
    import { 
        AnimatedLayout,
        SlideInRight,
        SlideOutLeft,
        SlideInDown,
        SlideOutUp,
        SlideInLeft,
        SlideOutRight,
        OpacityIn,
        OpacityOut,
    } from 'react-native-reanimated';
    
    const AnimatedText = Animated.createAnimatedComponent(Text);
    ​
    function SWMLogo() {
    ​
        return (
            <AnimatedLayout>
                <Animated.View 
                    entering={SlideInRight.delay(300)} 
                    exiting={SlideOutLeft.delay(300)} 
                    style={styles.left} 
                />
                <Animated.View 
                    entering={SlideInDown} 
                    exiting={SlideOutUp} 
                    style={styles.top} 
                />
                <Animated.View 
                    entering={SlideInLeft} 
                    exiting={SlideOutRight} 
                    style={styles.animatedView} 
                >
                    <AnimatedText 
                        entering={OpacityIn.delay(600).duration(3000)} 
                        exiting={OpacityOut.duration(3000)}
                    > 
                        SWM 
                    </AnimatedText>
                </Animated.View>
            </AnimatedLayout>
        );
    }
```

[gif]


