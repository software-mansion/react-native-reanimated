---
id: animatedLayout
title: <AnimatedLayout>
sidebar_label: <AnimatedLayout>
---
The `AnimatedLayout` component is responsible for observing changes in its subtree `AnimatedLayout`. You can treat it as a `View` component because it takes the same set of properties. The component is essential for entering and exiting animations as well as layout transitions and each animated component that wants to make use of any layout animation has to be placed under an `AnimatedLayout` component. There are two important notes about this component that you should keep in mind: 
 - It will manage all its descendants' animations even if it's mounting and unmounting by itself.
 - There is no need to nest one `AnimatedLayout` in another one because the higher one would already watch the subtree of the lower one. 


## Example
You can use `AnimatedLayout` as regural React component and his children can use by transitions and mounting/unmpunting animations.

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

More advanced example with SWM's logo

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

See results:

<video src="https://user-images.githubusercontent.com/36106620/120326638-39ee0200-c2e9-11eb-8dca-3f3b999c5017.mov" controls="controls" muted="muted"></video>


