import React from 'react';

// Shared stuff
function hermesWeb(configuration: string) {
  return (
    <>
      <p>
        <i>Selected: {configuration}</i>
        <br></br>
        Hermes engine is currently unavailable on Web platforms.
      </p>
    </>
  );
}
function v8OnlyAndroid(configuration: string) {
  return (
    <>
      <p>
        <i>Selected: {configuration}</i>
        <br></br>
        The V8 engine is currently only available on Android.
      </p>
    </>
  );
}
function chromeDevToolsOnlyHermes(configuration: string) {
  return (
    <>
      <p>
        <i>Selected: {configuration}</i>
        <br></br>
        Chrome DevTools only work with the Hermes engine.
      </p>
    </>
  );
}

// Nothing selected
export function nothingSelected() {
  return (
    <>
      <p>Please select a configuration to view the details</p>
    </>
  );
}

// ChromeDebugger/JSC
export function chromeDebuggerJSCAndroid() {
  return <></>;
}
export function chromeDebuggerJSCiOS() {
  return <></>;
}
export function chromeDebuggerJSCWeb() {
  return <></>;
}
// ChromeDebugger/Hermes
export function chromeDebuggerHermesAndroid() {
  return <></>;
}
export function chromeDebuggerHermesiOS() {
  return <></>;
}
export function chromeDebuggerHermesWeb() {
  return hermesWeb('Chrome Debugger/Hermes/Web');
}
// ChromeDebugger/V8
export function chromeDebuggerV8Android() {
  return <></>;
}
export function chromeDebuggerV8iOS() {
  return v8OnlyAndroid('Chrome Debugger/V8/iOS');
}
export function chromeDebuggerV8Web() {
  return v8OnlyAndroid('Chrome Debugger/V8/Web');
}

// ChromeDevTools/JSC
export function chromeDevToolsJSCAndroid() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/JSC/Android');
}
export function chromeDevToolsJSCiOS() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/JSC/iOS');
}
export function chromeDevToolsJSCWeb() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/JSC/Web');
}
// ChromeDevTools/Hermes
export function chromeDevToolsHermesAndroid() {
  return <></>;
}
export function chromeDevToolsHermesiOS() {
  return <></>;
}
export function chromeDevToolsHermesWeb() {
  return hermesWeb('Chrome DevTools/Hermes/Web');
}
// ChromeDevTools/V8
export function chromeDevToolsV8Android() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/V8/Android');
}
export function chromeDevToolsV8iOS() {
  return v8OnlyAndroid('Chrome DevTools/V8/iOS');
}
export function chromeDevToolsV8Web() {
  return v8OnlyAndroid('Chrome DevTools/V8/Web');
}

// Flipper/JSC
export function flipperJSCAndroid() {
  return <></>;
}
export function flipperJSCiOS() {
  return <></>;
}
export function flipperJSCWeb() {
  return <></>;
}
// Flipper/Hermes
export function flipperHermesAndroid() {
  return <></>;
}
export function flipperHermesiOS() {
  return <></>;
}
export function flipperHermesWeb() {
  return hermesWeb('Flipper/Hermes/Web');
}
// Flipper/V8
export function flipperV8Android() {
  return <></>;
}
export function flipperV8iOS() {
  return v8OnlyAndroid('Flipper/V8/iOS');
}
export function flipperV8Web() {
  return v8OnlyAndroid('Flipper/V8/Web');
}

// SafariDevTools/JSC
export function safariDevToolsJSCAndroid() {
  return <></>;
}
export function safariDevToolsJSCiOS() {
  return <></>;
}
export function safariDevToolsJSCWeb() {
  return <></>;
}
// SafariDevTools/Hermes
export function safariDevToolsHermesAndroid() {
  return <></>;
}
export function safariDevToolsHermesiOS() {
  return <></>;
}
export function safariDevToolsHermesWeb() {
  return hermesWeb('Safari DevTools/Hermes/Web');
}
// SafariDevTools/V8
export function safariDevToolsV8Android() {
  return <></>;
}
export function safariDevToolsV8iOS() {
  return v8OnlyAndroid('Safari DevTools/V8/iOS');
}
export function safariDevToolsV8Web() {
  return v8OnlyAndroid('Safari DevTools/V8/Web');
}

// ReactDevTools/JSC
export function reactDevToolsJSCAndroid() {
  return <></>;
}
export function reactDevToolsJSCiOS() {
  return <></>;
}
export function reactDevToolsJSCWeb() {
  return <></>;
}
// ReactDevTools/Hermes
export function reactDevToolsHermesAndroid() {
  return <></>;
}
export function reactDevToolsHermesiOS() {
  return <></>;
}
export function reactDevToolsHermesWeb() {
  return hermesWeb('React DevTools/Hermes/Web');
}
// ReactDevTools/V8
export function reactDevToolsV8Android() {
  return <></>;
}
export function reactDevToolsV8iOS() {
  return v8OnlyAndroid('React DevTools/V8/iOS');
}
export function reactDevToolsV8Web() {
  return v8OnlyAndroid('React DevTools/V8/Web');
}
