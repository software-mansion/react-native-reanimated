import Apps from 'common-app';
import { useEffect } from 'react';

import poppinsBlack from './assets/fonts/Poppins/Poppins-Black.ttf';
import poppinsBold from './assets/fonts/Poppins/Poppins-Bold.ttf';
import poppinsExtraBold from './assets/fonts/Poppins/Poppins-ExtraBold.ttf';
import poppinsExtraLight from './assets/fonts/Poppins/Poppins-ExtraLight.ttf';
import poppinsLight from './assets/fonts/Poppins/Poppins-Light.ttf';
import poppinsMedium from './assets/fonts/Poppins/Poppins-Medium.ttf';
import poppinsRegular from './assets/fonts/Poppins/Poppins-Regular.ttf';
import poppinsSemiBold from './assets/fonts/Poppins/Poppins-SemiBold.ttf';
import poppinsThin from './assets/fonts/Poppins/Poppins-Thin.ttf';
import ubuntuMono from './assets/fonts/UbuntuMono/UbuntuMono-Regular.ttf';

function fontFace(family: string, font: string, weight: number): string {
  return `
    @font-face {
      font-family: '${family}';
      src: url(${font}) format('truetype');
      font-weight: ${weight};
      font-display: swap;
    }
  `;
}

export default function App() {
  useEffect(() => {
    // Create style element for web
    const style = document.createElement('style');
    style.textContent = `
      ${fontFace('Poppins', poppinsThin, 100)}
      ${fontFace('Poppins', poppinsExtraLight, 200)}
      ${fontFace('Poppins', poppinsLight, 300)}
      ${fontFace('Poppins', poppinsRegular, 400)}
      ${fontFace('Poppins', poppinsMedium, 500)}
      ${fontFace('Poppins', poppinsSemiBold, 600)}
      ${fontFace('Poppins', poppinsBold, 700)}
      ${fontFace('Poppins', poppinsExtraBold, 800)}
      ${fontFace('Poppins', poppinsBlack, 900)}
      ${fontFace('UbuntuMono-Regular', ubuntuMono, 400)}
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <Apps />;
}
