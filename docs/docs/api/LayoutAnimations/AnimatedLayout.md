---
id: layout_animations_animated_layout
title: <AnimatedLayout>
sidebar_label: <AnimatedLayout>
---
The component is responsible for observing changes in its subtree. It manages all its decendents' animations. Even if it has been removed. There is no need to nest one `AnimatedLayout` in another one. You can treat it as a `View` component.

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



