import React, { useEffect, useState } from 'react';

/*
 * Caution - read before use!
 * As this hook uses innerWidth prop, which belongs to the window object,
 * it requires to use the viewport. Thus, building the production build of the
 * application may fail, as the Docusaurus is using SSR to serve it.
 * Remember to verify if user can use the viewport by using
 * `ExecutionEnvironment.canUseViewport` method, `<BrowserOnly>` component or
 * `useIsBrowser` hook.
 */
const useScreenSize = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  return {
    windowWidth,
  };
};

export default useScreenSize;
