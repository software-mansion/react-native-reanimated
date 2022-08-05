import React from 'react';

// Shared stuff
function v8OnlyAndroid(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      The V8 engine is currently only available on Android.
    </p>
  );
}
function chromeDevToolsOnlyHermes(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Chrome DevTools only work with the Hermes engine.
    </p>
  );
}
function flipperNoJSC(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Flipper doesn't work well with non-Hermes runtimes as it was mostly
      designed to debug Hermes apps. The layout inspector and built-in React
      DevTools will work and some logs will be visible but setting breakpoints
      or viewing the source code is not possible.
    </p>
  );
}
function safariDevToolsiOSOnly(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Safari DevTools only work with iOS devices.
    </p>
  );
}
function chromeDebuggerShared(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i> <br></br>
      Since the Chrome Debugger runs it's own web worker all the code is run on
      the JS thread. This means that this piece of code:
      <pre>{`function runWorklet() {
  'worklet';
  console.log('worklet:', _WORKLET);
}
runOnUI(runWorklet)();`}</pre>
      would output:
      <pre>{`LOG: worklet: false`}</pre>
      But despite this, all native functions like <code>scrollTo</code> and{' '}
      <code>measure</code> are still available. It is also possible to set
      breakpoints both in normal JS code as well as in worklet (since they run
      on the main JS thread now).
    </p>
  );
}

// Nothing selected
export function nothingSelected() {
  return (
    <>
      <p>
        <i>Please select a configuration to view the details</i>
      </p>
    </>
  );
}

// ChromeDebugger/JSC
export function chromeDebuggerJSCAndroid() {
  return chromeDebuggerShared('Chrome Debugger/JSC/Android');
}
export function chromeDebuggerJSCiOS() {
  return chromeDebuggerShared('Chrome Debugger/JSC/iOS');
}
// ChromeDebugger/Hermes
export function chromeDebuggerHermesAndroid() {
  return <></>;
}
export function chromeDebuggerHermesiOS() {
  return <></>;
}
// ChromeDebugger/V8
export function chromeDebuggerV8Android() {
  return <></>;
}
export function chromeDebuggerV8iOS() {
  return v8OnlyAndroid('Chrome Debugger/V8/iOS');
}

// ChromeDevTools/JSC
export function chromeDevToolsJSCAndroid() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/JSC/Android');
}
export function chromeDevToolsJSCiOS() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/JSC/iOS');
}
// ChromeDevTools/Hermes
export function chromeDevToolsHermesAndroid() {
  return <></>;
}
export function chromeDevToolsHermesiOS() {
  return <></>;
}
// ChromeDevTools/V8
export function chromeDevToolsV8Android() {
  return chromeDevToolsOnlyHermes('Chrome DevTools/V8/Android');
}
export function chromeDevToolsV8iOS() {
  return v8OnlyAndroid('Chrome DevTools/V8/iOS');
}

// Flipper/JSC
export function flipperJSCAndroid() {
  return flipperNoJSC('Flipper/JSC/Android');
}
export function flipperJSCiOS() {
  return flipperNoJSC('Flipper/JSC/iOS');
}
// Flipper/Hermes
export function flipperHermesAndroid() {
  return <></>;
}
export function flipperHermesiOS() {
  return <></>;
}
// Flipper/V8
export function flipperV8Android() {
  return <></>;
}
export function flipperV8iOS() {
  return v8OnlyAndroid('Flipper/V8/iOS');
}

// SafariDevTools/JSC
export function safariDevToolsJSCAndroid() {
  return safariDevToolsiOSOnly('Safari DevTools/JSC/Android');
}
export function safariDevToolsJSCiOS() {
  return (
    <>
      <p>
        <i>Selected: Safari DevTools/JSC/iOS</i>
        <br></br>
        After opening Safari and configuring it as specified in the React Native
        docs, under <code>Develop &gt; Device</code> you'll see two JSC contexts
        like in the screenshot below:
        <img
          src="/react-native-reanimated/img/debugging/SafariJSCiOS.png"
          alt="Screenshot showing Safari's Develop menu options"
        />
      </p>
      <p>
        One of them will be the main JS context. All <code>console.log</code>
        outputs will appear in the console of this context. You can also set
        breakpoints here, but unfortunatley the only source file visible is the
        transformed <code>indexjs.bundle</code> which does make things more
        difficult to find. <br></br>
        The other option will be the UI context. No console logs will appear in
        the console of this context, but all worklet functions should be visible
        as separate files. It is also possible to set breakpoints in these
        worklets.
      </p>
      <p>
        <b>Caution!</b>{' '}
        <i>
          Remember that console logs will appear on the main thread as the
          console.log funcion on the UI thread is just a reference to the one
          from the JS thread.
        </i>
      </p>
    </>
  );
}
// SafariDevTools/Hermes
export function safariDevToolsHermesAndroid() {
  return safariDevToolsiOSOnly('Safari DevTools/Hermes/Android');
}
export function safariDevToolsHermesiOS() {
  return <></>;
}
// SafariDevTools/V8
export function safariDevToolsV8Android() {
  return safariDevToolsiOSOnly('Safari DevTools/V8/Android');
}
export function safariDevToolsV8iOS() {
  return v8OnlyAndroid('Safari DevTools/V8/iOS');
}

// ReactDevTools/JSC
export function reactDevToolsJSCAndroid() {
  return (
    <p>
      <i>Selection: React DevTools/JSC/iOS</i>
      <br></br>
      React DevTools work as expected and the profiler and layout inspector can
      be used as usual after running the command:
      <pre>{`adb reverse tcp:8097 tcp:8097`}</pre>
    </p>
  );
}
export function reactDevToolsJSCiOS() {
  return (
    <p>
      <i>Selection: React DevTools/JSC/iOS</i>
      <br></br>
      React DevTools work as expected and the profiler and layout inspector can
      be used as usual.
    </p>
  );
}
// ReactDevTools/Hermes
export function reactDevToolsHermesAndroid() {
  return <></>;
}
export function reactDevToolsHermesiOS() {
  return <></>;
}
// ReactDevTools/V8
export function reactDevToolsV8Android() {
  return <></>;
}
export function reactDevToolsV8iOS() {
  return v8OnlyAndroid('React DevTools/V8/iOS');
}
