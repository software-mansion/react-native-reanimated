// Import the original mapper	
import MDXComponents from '@theme-original/MDXComponents';	
import InteractiveExample from '@site/src/components/InteractiveExample';	
import PlatformCompatibility from '@site/src/components/PlatformCompatibility';	
import { Yes, No, Version, Spacer } from '@site/src/components/Compatibility';	
import Indent from '@site/src/components/Indent';	

export default {	
  // Re-use the default mapping	
  ...MDXComponents,	
  // Map the "<Highlight>" tag to our Highlight component	
  // `Highlight` will receive all props that were passed to `<Highlight>` in MDX	
  InteractiveExample,	
  PlatformCompatibility,	
  Yes,	
  No,	
  Version,	
  Spacer,	
  Indent,	
};	
