import React from 'react';

/*
  Testing setup:
    - Shared:
      - react-native: 0.69.3
      - empty app generated using the typescript template
      - added reanimated only
      - tested: scrollTo, measure, useAnimatedSensor, console logs with _WORKLET
    - Android:
      - Device: Pixel 5 API 32
    - iOS:
      - Device: iPhone 13 Pro (iOS 15.5)
*/

export function SummaryTable() {
  return (
    <>
      <table>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Tool</th>
            <th style={{ width: '10%' }}>Platform</th>
            <th style={{ width: '20%' }}>JSC</th>
            <th style={{ width: '20%' }}>Hermes</th>
            <th style={{ width: '20%' }}>V8</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2}>
              <a href="#chrome-debugger">Chrome debugger</a>
            </td>
            <td style={{ textAlign: 'center' }}>Android</td>
            <td style={{ textAlign: 'center' }}>✅ ¹</td>
            <td style={{ textAlign: 'center' }}>✅ ¹</td>
            <td style={{ textAlign: 'center' }}>✅ ¹</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>iOS</td>
            <td style={{ textAlign: 'center' }}>✅ ¹</td>
            <td style={{ textAlign: 'center' }}>✅ ¹</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#chrome-devtools">Chrome DevTools</a>
            </td>
            <td style={{ textAlign: 'center' }}>Android</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center' }}>✅ ²</td>
            <td style={{ textAlign: 'center' }}>✅ ²</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>iOS</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center' }}>✅ ²</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#flipper-hermes-debugger">Flipper (Hermes debugger)</a>
            </td>
            <td style={{ textAlign: 'center' }}>Android</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center' }}>✅ ²</td>
            <td style={{ textAlign: 'center' }}>✅ ²</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>iOS</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center' }}>✅ ²</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#safari-devtools">Safari DevTools</a>
            </td>
            <td style={{ textAlign: 'center' }}>Android</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>iOS</td>
            <td style={{ textAlign: 'center' }}>✅</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#react-developer-tools">React Developer Tools</a>
            </td>
            <td style={{ textAlign: 'center' }}>Android</td>
            <td style={{ textAlign: 'center' }}>✅</td>
            <td style={{ textAlign: 'center' }}>✅</td>
            <td style={{ textAlign: 'center' }}>✅</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>iOS</td>
            <td style={{ textAlign: 'center' }}>✅</td>
            <td style={{ textAlign: 'center' }}>✅</td>
            <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          </tr>
        </tbody>
      </table>
      ¹ - Works, but uses web implementations of functions and runs worklets on
      the JS thread. This means that{' '}
      <a href="../../api/nativeMethods/measure">measure</a> and LayoutAnimations
      will not be available.
      <br />² - Works, but only the JS context can be debugged.
      <h4 style={{ marginBottom: 6 }}>Legend:</h4>
      <ul>
        <li>✅ - available in React Native apps using Reanimated</li>
        <li>N/A - unavailable in React Native apps</li>
      </ul>
    </>
  );
}

export function ChromeDebuggerTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
        </tr>
      </tbody>
    </table>
  );
}

export function ChromeDevToolsTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
        </tr>
      </tbody>
    </table>
  );
}

export function FlipperTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
        </tr>
      </tbody>
    </table>
  );
}

export function SafariDevToolsTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
        </tr>
      </tbody>
    </table>
  );
}

export function ReactDeveloperToolsTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center' }}>✅</td>
          <td style={{ textAlign: 'center', color: 'lightgray' }}>N/A</td>
        </tr>
      </tbody>
    </table>
  );
}

const styles = {
  width20: {
    width: '20%',
  },
  center: {
    textAlign: 'center',
  },
  notAvailable: {
    color: 'lightgray',
  },
};
