import React from 'react';
import { detailsMap } from './details_map';

export default function DebuggingInfoTable() {
  const [details, setDetails] = React.useState('');

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
                setDetails('chromeDebugger/JSC/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDebugger/hermes/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDebugger/V8/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDebugger/JSC/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDebugger/hermes/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDebugger/V8/iOS');
                location.href = '#Details';
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
                setDetails('chromeDevTools/JSC/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDevTools/hermes/Android');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDevTools/V8/Android');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDevTools/JSC/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDevTools/hermes/iOS');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('chromeDevTools/V8/iOS');
                location.href = '#Details';
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
                setDetails('flipper/JSC/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('flipper/hermes/Android');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('flipper/V8/Android');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('flipper/JSC/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('flipper/hermes/iOS');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('flipper/V8/iOS');
                location.href = '#Details';
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
                setDetails('safariDevTools/JSC/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('safariDevTools/hermes/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('safariDevTools/V8/Android');
                location.href = '#Details';
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
                setDetails('safariDevTools/JSC/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('safariDevTools/hermes/iOS');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('safariDevTools/V8/iOS');
                location.href = '#Details';
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
                setDetails('reactDevTools/JSC/Android');
                location.href = '#Details';
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('reactDevTools/hermes/Android');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('reactDevTools/V8/Android');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('reactDevTools/JSC/iOS');
                location.href = '#Details';
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('reactDevTools/hermes/iOS');
                location.href = '#Details';
              }}>
              ❓
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('reactDevTools/V8/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
        </tr>
      </table>

      <h4>Symbols:</h4>
      <ul>
        <li>
          ✅ - this method is available, an asterisk indicates that some
          limitations apply
        </li>
        <li>❌ - unavailable in apps using Reanimated</li>
        <li>N/A - unavailable in React Native apps</li>
      </ul>

      <h3 id="Details">Details</h3>
      {detailsMap.get(details)}
    </>
  );
}
