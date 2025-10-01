import React from 'react';
import { getInitColorSchemeScript } from '@mui/material/styles';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '@site/src/theme/muiTheme';

export default function Root({ children }) {
  return (
    <>
      {getInitColorSchemeScript()}
      <CssVarsProvider theme={theme}>{children}</CssVarsProvider>
    </>
  );
}
