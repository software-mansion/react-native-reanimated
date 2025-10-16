import React from 'react';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import theme from '@site/src/theme/muiTheme';

export default function Root({ children }) {
  return (
    <>
      <InitColorSchemeScript />
      <CssVarsProvider theme={theme}>{children}</CssVarsProvider>
    </>
  );
}
