import React from 'react';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { translate } from '@docusaurus/Translate';
import IconLightMode from '@theme/Icon/LightMode';
import IconDarkMode from '@theme/Icon/DarkMode';
import styles from './styles.module.css';
import { useColorScheme } from '@mui/material';
import usePageType from '@site/src/hooks/usePageType';
function ColorModeToggle({ className, buttonClassName, value, onChange }) {
  const isBrowser = useIsBrowser();
  /* Color scheme switcher from MUI framework. */
  const { setMode } = useColorScheme();
  const { isLanding } = usePageType();

  const title = translate(
    {
      message: 'Switch between dark and light mode (currently {mode})',
      id: 'theme.colorToggle.ariaLabel',
      description: 'The ARIA label for the navbar color mode toggle',
    },
    {
      mode:
        value === 'dark'
          ? translate({
              message: 'dark mode',
              id: 'theme.colorToggle.ariaLabel.mode.dark',
              description: 'The name for the dark color mode',
            })
          : translate({
              message: 'light mode',
              id: 'theme.colorToggle.ariaLabel.mode.light',
              description: 'The name for the light color mode',
            }),
    }
  );

  const changeTheme = (value) => {
    onChange(value); // Default theme switcher
    setMode(value); // Color scheme switcher from MUI
  };

  return (
    <div className={clsx(styles.toggle, className)}>
      <button
        className={clsx(
          'clean-btn',
          styles.toggleButton,
          !isBrowser && styles.toggleButtonDisabled,
          isLanding && styles.toggleButtonLanding,
          buttonClassName
        )}
        type="button"
        onClick={() => changeTheme(value === 'dark' ? 'light' : 'dark')}
        disabled={!isBrowser}
        title={title}
        aria-label={title}
        aria-live="polite">
        <div
          className={clsx(
            styles.iconContainer,
            styles.lightToggleIcon,
            isLanding && styles.iconLandingContainer
          )}>
          <IconLightMode />
        </div>
        <div
          className={clsx(
            styles.iconContainer,
            styles.darkIconContainer,
            styles.darkToggleIcon,
            isLanding && styles.iconLandingContainer
          )}>
          <IconDarkMode />
        </div>
      </button>
    </div>
  );
}
export default React.memo(ColorModeToggle);
