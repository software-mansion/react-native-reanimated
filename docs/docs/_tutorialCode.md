```jsx {1,4-6,11}
    import React from 'react';

    function MyComponent(props) {
    if (props.isBar) {
        return <div>Bar</div>;
    }

    return <div>Foo</div>;
    }

    export default MyComponent;
```