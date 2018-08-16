import React from 'react';

import createAnimatedComponent from '../createAnimatedComponent';

// null means that component only behaves like component but it's not related to
// any real view. Passing special numbers or string does not work
const Code = createAnimatedComponent(null);

export default props => (
  <Code
    exec={
      props.exec
        ? props.exec()
        : typeof props.children === 'function'
          ? props.children()
          : null
    }
  />
);
