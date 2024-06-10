import React from 'react';
import styles from './styles.module.css';

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
            <th className={styles.width30}>Tool</th>
            <th className={styles.width10}>Platform</th>
            <th className={styles.width20}>JSC</th>
            <th className={styles.width20}>Hermes</th>
            <th className={styles.width20}>V8</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2}>
              <a href="#chrome-debugger">Chrome debugger</a>
            </td>
            <td className={styles.cellNormal}>Android</td>
            <td className={styles.cellNormal}>⚛️ ✅ ¹</td>
            <td className={styles.cellNormal}>⚛️ ✅ ¹</td>
            <td className={styles.cellNormal}>⚛️ ✅ ¹</td>
          </tr>
          <tr>
            <td className={styles.cellNormal}>iOS</td>
            <td className={styles.cellNormal}>⚛️ ✅ ¹</td>
            <td className={styles.cellNormal}>⚛️ ✅ ¹</td>
            <td className={styles.cellNotAvailable}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#chrome-devtools">Chrome DevTools</a>
            </td>
            <td className={styles.cellNormal}>Android</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNormal}>⚛️ ✅ ²</td>
            <td className={styles.cellNormal}>⚛️</td>
          </tr>
          <tr>
            <td className={styles.cellNormal}>iOS</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNormal}>⚛️ ✅ ²</td>
            <td className={styles.cellNotAvailable}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#flipper-hermes-debugger">Flipper (Hermes debugger)</a>
            </td>
            <td className={styles.cellNormal}>Android</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNormal}>⚛️ ✅ ²</td>
            <td className={styles.cellNormal}>⚛️</td>
          </tr>
          <tr>
            <td className={styles.cellNormal}>iOS</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNormal}>⚛️ ✅ ²</td>
            <td className={styles.cellNotAvailable}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#safari-devtools">Safari DevTools</a>
            </td>
            <td className={styles.cellNormal}>Android</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNotAvailable}>N/A</td>
          </tr>
          <tr>
            <td className={styles.cellNormal}>iOS</td>
            <td className={styles.cellNormal}>⚛️ ✅</td>
            <td className={styles.cellNotAvailable}>N/A</td>
            <td className={styles.cellNotAvailable}>N/A</td>
          </tr>
          <tr>
            <td rowSpan={2}>
              <a href="#react-developer-tools">React Developer Tools</a>
            </td>
            <td className={styles.cellNormal}>Android</td>
            <td className={styles.cellNormal}>⚛️</td>
            <td className={styles.cellNormal}>⚛️</td>
            <td className={styles.cellNormal}>⚛️</td>
          </tr>
          <tr>
            <td className={styles.cellNormal}>iOS</td>
            <td className={styles.cellNormal}>⚛️</td>
            <td className={styles.cellNormal}>⚛️</td>
            <td className={styles.cellNotAvailable}>N/A</td>
          </tr>
        </tbody>
      </table>
      ¹ - Works, but uses web implementations of functions and runs worklets on
      the JS thread. This means that{' '}
      <a href="/react-native-reanimated/docs/advanced/measure">measure</a> and
      Layout Animations will not be available.
      <br />² - Experimental feature (see description).
      <h4 style={{ marginBottom: 6 }}>Legend:</h4>
      <ul>
        <li>⚛️ ✅ - special features for React Native apps using Reanimated</li>
        <li>
          ⚛️ - works the same as with all React Native apps, debugging worklets
          is not available
        </li>
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
          <th className={styles.width20}>JSC</th>
          <th className={styles.width20}>Hermes</th>
          <th className={styles.width20}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={styles.cellNormal}>Android</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
        </tr>
        <tr>
          <td className={styles.cellNormal}>iOS</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNotAvailable}>N/A</td>
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
          <th className={styles.width20}>JSC</th>
          <th className={styles.width20}>Hermes</th>
          <th className={styles.width20}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={styles.cellNormal}>Android</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNormal}>⚛️</td>
        </tr>
        <tr>
          <td className={styles.cellNormal}>iOS</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNotAvailable}>N/A</td>
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
          <th className={styles.width20}>JSC</th>
          <th className={styles.width20}>Hermes</th>
          <th className={styles.width20}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={styles.cellNormal}>Android</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNormal}>⚛️</td>
        </tr>
        <tr>
          <td className={styles.cellNormal}>iOS</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNotAvailable}>N/A</td>
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
          <th className={styles.width20}>JSC</th>
          <th className={styles.width20}>Hermes</th>
          <th className={styles.width20}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={styles.cellNormal}>Android</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNotAvailable}>N/A</td>
        </tr>
        <tr>
          <td className={styles.cellNormal}>iOS</td>
          <td className={styles.cellNormal}>⚛️ ✅</td>
          <td className={styles.cellNotAvailable}>N/A</td>
          <td className={styles.cellNotAvailable}>N/A</td>
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
          <th className={styles.width20}>JSC</th>
          <th className={styles.width20}>Hermes</th>
          <th className={styles.width20}>V8</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={styles.cellNormal}>Android</td>
          <td className={styles.cellNormal}>⚛️</td>
          <td className={styles.cellNormal}>⚛️</td>
          <td className={styles.cellNormal}>⚛️</td>
        </tr>
        <tr>
          <td className={styles.cellNormal}>iOS</td>
          <td className={styles.cellNormal}>⚛️</td>
          <td className={styles.cellNormal}>⚛️</td>
          <td className={styles.cellNotAvailable}>N/A</td>
        </tr>
      </tbody>
    </table>
  );
}
