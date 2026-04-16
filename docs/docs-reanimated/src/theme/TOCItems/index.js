import { TOCItems } from '@swmansion/t-rex-ui';

import RadonBanner from '../../components/RadonBanner';

export default function TOCItemsWrapper(props) {
  return (
    <>
      <TOCItems slot={<RadonBanner />} {...props} />
    </>
  );
}
