import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useLocation } from '@docusaurus/router';
import { Navbar } from '@swmansion/t-rex-ui';
import TopPromoRotator, {
  PROMO_VERSION,
} from '@site/src/components/TopPromoRotator';

export default function NavbarWrapper(props) {
  const location = useLocation();
  const baseUrl = useBaseUrl('/');
  const isLanding = location.pathname === baseUrl;

  const [showPromo, setShowPromo] = React.useState(true);

  React.useEffect(() => {
    if (isLanding || typeof globalThis === 'undefined') {
      return;
    }

    try {
      const raw = globalThis.localStorage?.getItem('topPromoState');
      const state = raw ? JSON.parse(raw) : null;
      if (state?.v === PROMO_VERSION && state?.hidden) {
        setShowPromo(false);
      }
    } catch (_) {
      // ignore
    }
  }, [isLanding]);

  const handleClosePromo = React.useCallback(() => {
    setShowPromo(false);
    if (typeof globalThis !== 'undefined') {
      try {
        globalThis.localStorage?.setItem(
          'topPromoState',
          JSON.stringify({ v: PROMO_VERSION, hidden: true })
        );
      } catch {
        // ignore
      }
    }
  }, []);

  const titleImages = {
    light: useBaseUrl('/img/title.svg'),
    dark: useBaseUrl('/img/title-dark.svg'),
  };

  const heroImages = {
    logo: useBaseUrl('/img/logo.svg'),
  };
  return (
    <>
      {isLanding ? (
        <TopPromoRotator />
      ) : (
        showPromo && <TopPromoRotator onClose={handleClosePromo} />
      )}
      <Navbar heroImages={heroImages} titleImages={titleImages} {...props} />
    </>
  );
}
