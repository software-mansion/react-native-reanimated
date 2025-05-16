import React from 'react';
import DetailsStyling from '@site/src/theme/MDXComponents/DetailsStyling';
const MDXDetails = (props) => {
  const items = React.Children.toArray(props.children);
  // Split summary item from the rest to pass it as a separate prop to the
  // Details theme component
  const summary = items.find(
    (item) => React.isValidElement(item) && item.type === 'summary'
  );

  const children = <>{items.filter((item) => item !== summary)}</>;
  return (
    <DetailsStyling {...props} summary={summary}>
      {children}
    </DetailsStyling>
  );
};

export default MDXDetails;
