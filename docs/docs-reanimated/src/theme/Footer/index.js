import React, { useEffect } from 'react';
import { Footer as TRexFooter } from '@swmansion/t-rex-ui';

const PRIVACY_POLICY_URL = 'https://swmansion.com/privacy/policy/';

export default function Footer(props) {
  useEffect(() => {
    const paragraph = document.querySelector('footer .footer__copyright p');
    if (!paragraph || paragraph.querySelector('[data-privacy-policy]')) {
      return;
    }

    paragraph.appendChild(document.createTextNode(' Read about our '));
    const link = document.createElement('a');
    link.href = PRIVACY_POLICY_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.privacyPolicy = '';
    link.textContent = 'Privacy Policy';
    paragraph.appendChild(link);
    paragraph.appendChild(document.createTextNode('.'));
  }, []);

  return <TRexFooter {...props} />;
}
