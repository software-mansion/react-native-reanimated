// Import the original mapper
import MDXComponents from '@theme-original/MDXComponents';
import InteractiveExample from '@site/src/components/InteractiveExample';
import CollapsibleCode from '@site/src/components/CollapsibleCode';
import PlatformCompatibility from '@site/src/components/PlatformCompatibility';
import { Yes, No, Version, Spacer } from '@site/src/components/Compatibility';
import Optional from '@site/src/components/Optional';
import AvailableFrom from '@site/src/components/AvailableFrom';
import Indent from '@site/src/components/Indent';
import Grid from '@site/src/components/Grid';

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Map the "<Highlight>" tag to our Highlight component
  // `Highlight` will receive all props that were passed to `<Highlight>` in MDX
  InteractiveExample,
  CollapsibleCode,
  PlatformCompatibility,
  Yes,
  No,
  Version,
  Spacer,
  Optional,
  AvailableFrom,
  Indent,
  Grid,
};
