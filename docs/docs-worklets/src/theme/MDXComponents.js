// Import the original mapper
import MDXComponents from '@theme-original/MDXComponents';
import InteractiveExample from '@site/src/components/InteractiveExample';
import {
  Yes,
  No,
  Version,
  Spacer,
  WorkletsCompatibility,
} from '@site/src/components/Compatibility';
import Indent from '@site/src/components/Indent';
import DeprecatedBanner from '@site/src/components/DeprecatedBanner';
import AvailableFrom from '../components/AvailableFrom';
import SerializableSupportedTypesTable from '@site/src/components/SerializableTypes';
import SVGDiagram from '@site/src/components/SVGDiagram';

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Map the "<Highlight>" tag to our Highlight component
  // `Highlight` will receive all props that were passed to `<Highlight>` in MDX
  AvailableFrom,
  InteractiveExample,
  Yes,
  No,
  Version,
  Spacer,
  Indent,
  DeprecatedBanner,
  WorkletsCompatibility,
  SerializableSupportedTypesTable,
  SVGDiagram,
};
