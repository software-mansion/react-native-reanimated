import React, { useEffect } from 'react';
import { detailsMap } from './details_map';

export default function DebuggingInfoTable() {
  const [details, setDetails] = React.useState('');

  useEffect(() => {
    location.href = '#details';
  }, [details]);

  return (
    <>
      <table>
        <tr>
          <th>Tool</th>
          <th>Platform</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
        <tr>
          <td rowSpan={2}>Chrome debugger</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/JSC/Android');
              }}>
              ✅
            </button>{' '}
            ¹
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/Hermes/Android');
              }}>
              ✅
            </button>{' '}
            ¹
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/V8/Android');
              }}>
              ✅
            </button>{' '}
            ¹
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/JSC/iOS');
              }}>
              ✅
            </button>{' '}
            ¹
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/Hermes/iOS');
              }}>
              ✅
            </button>{' '}
            ¹
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/V8/iOS');
              }}>
              N/A
            </button>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>Chrome DevTools</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/JSC/Android');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/Hermes/Android');
              }}>
              ✅
            </button>{' '}
            ²
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/V8/Android');
              }}>
              ✅
            </button>{' '}
            ²
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/JSC/iOS');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/Hermes/iOS');
              }}>
              ✅
            </button>{' '}
            ²
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/V8/iOS');
              }}>
              N/A
            </button>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>Flipper (Hermes debugger)</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/JSC/Android');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/Hermes/Android');
              }}>
              ✅
            </button>{' '}
            ²
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/V8/Android');
              }}>
              ✅
            </button>
            ²
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/JSC/iOS');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/Hermes/iOS');
              }}>
              ✅
            </button>{' '}
            ²
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/V8/iOS');
              }}>
              N/A
            </button>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>Safari DevTools</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/JSC/Android');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/Hermes/Android');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/V8/Android');
              }}>
              N/A
            </button>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/JSC/iOS');
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/Hermes/iOS');
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/V8/iOS');
              }}>
              N/A
            </button>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>React DevTools</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/JSC/Android');
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/Hermes/Android');
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/V8/Android');
              }}>
              ✅
            </button>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/JSC/iOS');
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/Hermes/iOS');
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/V8/iOS');
              }}>
              N/A
            </button>
          </td>
        </tr>
      </table>
      ¹ - Works, but uses web implementations of function and runs everything on
      the JS thread.
      <br></br>² - Only the JS context can be debugged.
      <h4>Key to symbols:</h4>
      <ul>
        <li>
          ✅ - available in apps using Reanimated, an asterisk indicates that
          some limitations apply
        </li>
        <li>❌ - unavailable in apps using Reanimated</li>
        <li>N/A - unavailable in React Native apps</li>
      </ul>
      <h3 style={{ marginBottom: 0 }} id="details">
        Details
      </h3>
      <p>{details && <i>Selection: {details}</i>}</p>
      {detailsMap.get(details)}
    </>
  );
}
