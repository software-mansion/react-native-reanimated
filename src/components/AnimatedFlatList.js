import * as React from 'react';
import { FlatList } from 'react-native';
import createAnimatedComponent from '../createAnimatedComponent';

const FlatListWithEventThrottle = React.forwardRef((props, ref) => (
    <FlatList scrollEventThrottle={0.0001} {...props} ref={ref} />
));

module.exports = createAnimatedComponent(
    FlatListWithEventThrottle,
);