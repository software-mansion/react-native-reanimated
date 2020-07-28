import * as React from 'react';
import { SectionList } from 'react-native';
import createAnimatedComponent from '../createAnimatedComponent';

const SectionListWithEventThrottle = React.forwardRef((props, ref) => (
    <SectionList scrollEventThrottle={0.0001} {...props} ref={ref} />
));

module.exports = createAnimatedComponent(
    SectionListWithEventThrottle,
);