// Import the original mapper
import MDXComponents from '@theme-original/MDXComponents';
import InteractiveExample from '@site/src/components/InteractiveExample';
import InteractivePlayground from '@site/src/components/InteractivePlayground';
import CollapsibleCode from '@site/src/components/CollapsibleCode';
import PlatformCompatibility from '@site/src/components/PlatformCompatibility';
import ExampleVideo from '@site/src/components/ExampleVideo';
import { Yes, No, Version, Spacer } from '@site/src/components/Compatibility';
import Optional from '@site/src/components/Optional';
import AvailableFrom from '@site/src/components/AvailableFrom';
import Indent from '@site/src/components/Indent';
import Row from '@site/src/components/Row';
import Grid from '@site/src/components/Grid';
import ThemedVideo from '@site/src/components/ThemedVideo';

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Map the "<Highlight>" tag to our Highlight component
  // `Highlight` will receive all props that were passed to `<Highlight>` in MDX
  InteractiveExample,
  InteractivePlayground,
  CollapsibleCode,
  PlatformCompatibility,
  ExampleVideo,
  Yes,
  No,
  Version,
  Spacer,
  Optional,
  AvailableFrom,
  Indent,
  Row,
  Grid,
  ThemedVideo,
};
