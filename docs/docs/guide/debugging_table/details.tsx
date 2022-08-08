import React from 'react';
import CodeBlock from '@theme/CodeBlock';

// Shared stuff
function V8OnlyAndroid() {
  return <p>The V8 engine is currently only available on Android.</p>;
}
function ChromeDevToolsNoJSC() {
  return <p>Chrome DevTools don't work with the JSC engine.</p>;
}
function FlipperNoJSC() {
  return (
    <p>
      Flipper doesn't work well with the JSC runtime as it was mostly designed
      to debug Hermes apps. The layout inspector and built-in React DevTools
      will work and some logs will be visible but setting breakpoints or viewing
      the source code is not possible.
    </p>
  );
}
function SafariDevToolsiOSOnly() {
  return (
    <p>Safari DevTools only work with iOS devices running the JSC engine.</p>
  );
}
function ChromeDebuggerShared() {
  return (
    <p>
      Since the Chrome Debugger runs it's own web worker all the code is run on
      the JS thread so it also uses the JavaScript engine provided by your web
      browser (V8 in Chrome, JSC in Safari and SpiderMonkey in Firefox). This
      means that this piece of code:
      <CodeBlock className="language-js">
        {`function runWorklet() {
  'worklet';
  console.log('worklet:', _WORKLET);
}
runOnUI(runWorklet)();`}
      </CodeBlock>
      would output:
      <CodeBlock>{`LOG: worklet: false`}</CodeBlock>
      Another side effect is that Reanimated uses the web implementations of all
      function. This means that the <code>scrollTo</code> function will work
      (using the native web implementation), but the <code>measure</code>{' '}
      function will not be available and it's usage will trigger this error:
      <CodeBlock>{`[reanimated.measure] method cannot be used for web or Chrome Debugger`}</CodeBlock>
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
      which only works on mobile platforms. When debugging in Chrome and using
      this hook the following message will appear in the logs:
      <CodeBlock>{`[Reanimated] useAnimatedSensor is not available on web yet. `}</CodeBlock>
      But despite all of this, it is still possible to set breakpoints both in
      normal JS code as well as in worklets (since they run on the main JS
      thread now).
    </p>
  );
}
function FlipperHermesV8Shared() {
  return (
    <p>
      Even though Flipper supports the Hermes and V8 engines it unfortunately
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
function ChromeDevToolsHermesV8Shared() {
  return (
    <p>
      Even though Chrome DevTools support the Hermes and V8 engines they
      unfortunatley don't recognize Reanimated's additional UI context. This
      means that you won't be able to debug worklets and breakpoints set in them
      will be ignored. All other features work as expected.
      <br></br>
      <i>
        We are actively working on enabling worklet debugging with Chrome
        DevTools on Hermes.
      </i>
    </p>
  );
}
function ReactDevToolsAndroidShared() {
  return (
    <p>
      React DevTools work as expected and the profiler and layout inspector can
      be used as usual after running the command:
      <CodeBlock>{`adb reverse tcp:8097 tcp:8097`}</CodeBlock>
    </p>
  );
}
function ReactDevToolsiOSShared() {
  return (
    <p>
      React DevTools work as expected and the profiler and layout inspector can
      be used as usual.
    </p>
  );
}

// Nothing selected
export function NothingSelected() {
  return (
    <>
      <p>
        <i>Please select a configuration to view the details.</i>
      </p>
    </>
  );
}

// ChromeDebugger/JSC
export function ChromeDebuggerJSCAndroid() {
  return ChromeDebuggerShared();
}
export function ChromeDebuggerJSCiOS() {
  return ChromeDebuggerShared();
}
// ChromeDebugger/Hermes
export function ChromeDebuggerHermesAndroid() {
  return ChromeDebuggerShared();
}
export function ChromeDebuggerHermesiOS() {
  return ChromeDebuggerShared();
}
// ChromeDebugger/V8
export function ChromeDebuggerV8Android() {
  return ChromeDebuggerShared();
}
export function ChromeDebuggerV8iOS() {
  return V8OnlyAndroid();
}

// ChromeDevTools/JSC
export function ChromeDevToolsJSCAndroid() {
  return ChromeDevToolsNoJSC();
}
export function ChromeDevToolsJSCiOS() {
  return ChromeDevToolsNoJSC();
}
// ChromeDevTools/Hermes
export function ChromeDevToolsHermesAndroid() {
  return ChromeDevToolsHermesV8Shared();
}
export function ChromeDevToolsHermesiOS() {
  return ChromeDevToolsHermesV8Shared();
}
// ChromeDevTools/V8
export function ChromeDevToolsV8Android() {
  return ChromeDevToolsHermesV8Shared();
}
export function ChromeDevToolsV8iOS() {
  return V8OnlyAndroid();
}

// Flipper/JSC
export function FlipperJSCAndroid() {
  return FlipperNoJSC();
}
export function FlipperJSCiOS() {
  return FlipperNoJSC();
}
// Flipper/Hermes
export function FlipperHermesAndroid() {
  return FlipperHermesV8Shared();
}
export function FlipperHermesiOS() {
  return FlipperHermesV8Shared();
}
// Flipper/V8
export function FlipperV8Android() {
  return FlipperHermesV8Shared();
}
export function FlipperV8iOS() {
  return V8OnlyAndroid();
}

// SafariDevTools/JSC
export function SafariDevToolsJSCAndroid() {
  return SafariDevToolsiOSOnly();
}
export function SafariDevToolsJSCiOS() {
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
          Remember that console logs will appear on the main thread as the{' '}
          <code>console.log</code> funcion on the UI thread is just a reference
          to the one from the JS thread.
        </i>
      </p>
    </>
  );
}
// SafariDevTools/Hermes
export function SafariDevToolsHermesAndroid() {
  return SafariDevToolsiOSOnly();
}
export function SafariDevToolsHermesiOS() {
  return SafariDevToolsiOSOnly();
}
// SafariDevTools/V8
export function SafariDevToolsV8Android() {
  return SafariDevToolsiOSOnly();
}
export function SafariDevToolsV8iOS() {
  return V8OnlyAndroid();
}

// ReactDevTools/JSC
export function ReactDevToolsJSCAndroid() {
  return ReactDevToolsAndroidShared();
}
export function ReactDevToolsJSCiOS() {
  return ReactDevToolsiOSShared();
}
// ReactDevTools/Hermes
export function ReactDevToolsHermesAndroid() {
  return ReactDevToolsAndroidShared();
}
export function ReactDevToolsHermesiOS() {
  return ReactDevToolsiOSShared();
}
// ReactDevTools/V8
export function ReactDevToolsV8Android() {
  return ReactDevToolsAndroidShared();
}
export function ReactDevToolsV8iOS() {
  return V8OnlyAndroid();
}
