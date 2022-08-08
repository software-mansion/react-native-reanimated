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
function chromeDevToolsNoJSC(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Chrome DevTools don't work with the JSC engine.
    </p>
  );
}
function flipperNoJSC(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Flipper doesn't work well with the JSC runtime as it was mostly designed
      to debug Hermes apps. The layout inspector and built-in React DevTools
      will work and some logs will be visible but setting breakpoints or viewing
      the source code is not possible.
    </p>
  );
}
function safariDevToolsiOSOnly(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Safari DevTools only work with iOS devices running the JSC engine.
    </p>
  );
}
function chromeDebuggerShared(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i> <br></br>
      Since the Chrome Debugger runs it's own web worker all the code is run on
      the JS thread and it also uses the JavaScript engine provided by your web
      browser (V8 in Chrome, JSC in Safari and SpiderMonkey in Firefox). This
      means that this piece of code:
      <pre>{`function runWorklet() {
  'worklet';
  console.log('worklet:', _WORKLET);
}
runOnUI(runWorklet)();`}</pre>
      would output:
      <pre>{`LOG: worklet: false`}</pre>
      Another side effect is that Reanimated uses web implementations of all
      function. This means that the <code>scrollTo</code> function will work
      (using the native web implementation), but the <code>measure</code>{' '}
      function will not be available and it's usage will trigger this error:
      <pre>{`[reanimated.measure] method cannot be used for web or Chrome Debugger`}</pre>
      You may stil use the standard web version of measure as described{' '}
      <a
        href={
          'https://docs.swmansion.com/react-native-reanimated/docs/api/nativeMethods/measure'
        }>
        here
      </a>
      .<br></br>
      Those functions that are provided by Reanimated and do not have web
      implementations won't work. <br></br>
      An example of this behaviour is the <code>useAnimatedSensor</code> hook
      which only works on mobile platforms. When debugging in chrome and using
      this hook the following message will appear in the logs:
      <pre>{`[Reanimated] useAnimatedSensor is not available on web yet. `}</pre>
      But despite all of this, it is still possible to set breakpoints both in
      normal JS code as well as in worklets (since they run on the main JS
      thread now).
    </p>
  );
}
function flipperHermesV8Shared(configuration: string) {
  return (
    <p>
      <i>Selected: {configuration}</i>
      <br></br>
      Even though Flipper supports the Hermes and V8 engines it unfortunatley
      doesn't recognize Reanimated's additional UI context. This means that you
      won't be able to debug worklets and breakpoints set in them will be
      ignored. All other features work as expected.
      <br></br>
      <i>
        We are actively working on enabling worklet debugging with Flipper on
        Hermes.
      </i>
    </p>
  );
}
function reactDevToolsAndroidShared(configuration: string) {
  return (
    <p>
      <i>Selection: {configuration}</i>
      <br></br>
      React DevTools work as expected and the profiler and layout inspector can
      be used as usual after running the command:
      <pre>{`adb reverse tcp:8097 tcp:8097`}</pre>
    </p>
  );
}
function reactDevToolsiOSShared(configuration: string) {
  return (
    <p>
      <i>Selection: {configuration}</i>
      <br></br>
      React DevTools work as expected and the profiler and layout inspector can
      be used as usual.
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
  return chromeDebuggerShared('Chrome Debugger/Hermes/Android');
}
export function chromeDebuggerHermesiOS() {
  return chromeDebuggerShared('Chrome Debugger/Hermes/iOS');
}
// ChromeDebugger/V8
export function chromeDebuggerV8Android() {
  return chromeDebuggerShared('Chrome Debugger/V8/Android');
}
export function chromeDebuggerV8iOS() {
  return v8OnlyAndroid('Chrome Debugger/V8/iOS');
}

// ChromeDevTools/JSC
export function chromeDevToolsJSCAndroid() {
  return chromeDevToolsNoJSC('Chrome DevTools/JSC/Android');
}
export function chromeDevToolsJSCiOS() {
  return chromeDevToolsNoJSC('Chrome DevTools/JSC/iOS');
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
  return <></>;
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
  return flipperHermesV8Shared('Flipper/Hermes/Android');
}
export function flipperHermesiOS() {
  return flipperHermesV8Shared('Flipper/Hermes/iOS');
}
// Flipper/V8
export function flipperV8Android() {
  return flipperHermesV8Shared('Flipper/V8/Android');
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
  return safariDevToolsiOSOnly('Safari DevTools/Hermes/iOS');
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
  return reactDevToolsAndroidShared('React DevTools/JSC/Android');
}
export function reactDevToolsJSCiOS() {
  return reactDevToolsiOSShared('React DevTools/JSC/iOS');
}
// ReactDevTools/Hermes
export function reactDevToolsHermesAndroid() {
  return reactDevToolsAndroidShared('React DevTools/Hermes/Android');
}
export function reactDevToolsHermesiOS() {
  return reactDevToolsiOSShared('React DevTools/Hermes/iOS');
}
// ReactDevTools/V8
export function reactDevToolsV8Android() {
  return reactDevToolsAndroidShared('React DevTools/V8/Android');
}
export function reactDevToolsV8iOS() {
  return v8OnlyAndroid('React DevTools/V8/iOS');
}
