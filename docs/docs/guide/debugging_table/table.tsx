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
                setDetails('Chrome Debugger/JSC/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/hermes/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/V8/Android');
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
                setDetails('Chrome Debugger/JSC/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/hermes/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome Debugger/V8/iOS');
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
                setDetails('Chrome DevTools/JSC/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/hermes/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/V8/Android');
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
                setDetails('Chrome DevTools/JSC/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/hermes/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Chrome DevTools/V8/iOS');
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
                setDetails('Flipper/JSC/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/hermes/Android');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/V8/Android');
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
                setDetails('Flipper/JSC/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/hermes/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Flipper/V8/iOS');
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
                setDetails('Safari DevTools/JSC/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/hermes/Android');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/V8/Android');
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
                setDetails('Safari DevTools/JSC/iOS');
                location.href = '#Details';
              }}>
              ✅*
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/hermes/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('Safari DevTools/V8/iOS');
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
                setDetails('React DevTools/JSC/Android');
                location.href = '#Details';
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/hermes/Android');
                location.href = '#Details';
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/V8/Android');
                location.href = '#Details';
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
                location.href = '#Details';
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/hermes/iOS');
                location.href = '#Details';
              }}>
              ✅
            </button>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setDetails('React DevTools/V8/iOS');
                location.href = '#Details';
              }}>
              N/A
            </button>
          </td>
        </tr>
      </table>

      <h4>Key to symbols:</h4>
      <ul>
        <li>
          ✅ - available in apps using Reanimated, an asterisk indicates that
          some limitations apply
        </li>
        <li>❌ - unavailable in apps using Reanimated</li>
        <li>N/A - unavailable in React Native apps</li>
      </ul>

      <h3 id="Details">Details</h3>
      {details === '' ? <></> : <i>Selection: {details}</i>}

      {detailsMap.get(details)}
    </>
  );
}
