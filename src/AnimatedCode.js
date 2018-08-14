import React from 'react';

import createAnimatedComponent from './createAnimatedComponent';

const Code = createAnimatedComponent(null);

export default props => (
  <Code
    exec={
      props.exec
        ? props.exec
        : typeof props.children === 'function'
          ? props.children()
          : null
    }
  />
);
