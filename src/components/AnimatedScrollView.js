import * as React from 'react';
import { ScrollView } from 'react-native';
import createAnimatedComponent from '../createAnimatedComponent';

const ScrollViewWithEventThrottle = React.forwardRef((props, ref) => (
    <ScrollView scrollEventThrottle={0.0001} {...props} ref={ref} />
));

module.exports = createAnimatedComponent(
    ScrollViewWithEventThrottle,
);