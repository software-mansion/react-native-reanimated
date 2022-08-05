import React from 'react';
import { detailsMap } from './details_map';

export default function DebuggingInfoTable() {
  const [details, setDetails] = React.useState('');

  return (
    <>
      <table>
        <tr>
          <th colSpan={2}>Tool</th>
          <th style={{ width: '20%' }}>JSC</th>
          <th style={{ width: '20%' }}>Hermes</th>
          <th style={{ width: '20%' }}>V8</th>
        </tr>
        <tr>
          <td rowSpan={2}>Chrome debugger</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/JSC/Android');
              }}>
              ✅*
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/hermes/Android');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/V8/Android');
              }}>
              ❓
            </a>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/JSC/iOS');
              }}>
              ✅*
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/hermes/iOS');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/V8/iOS');
              }}>
              X
            </a>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>Chrome DevTools</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/JSC/Android');
              }}>
              X
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/hermes/Android');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/V8/Android');
              }}>
              X
            </a>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/JSC/iOS');
              }}>
              X
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/hermes/iOS');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/V8/iOS');
              }}>
              X
            </a>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>Flipper (Hermes debugger)</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/JSC/Android');
              }}>
              X
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/hermes/Android');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/V8/Android');
              }}>
              ❓
            </a>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/JSC/iOS');
              }}>
              X
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/hermes/iOS');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/V8/iOS');
              }}>
              X
            </a>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>Safari DevTools</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/JSC/Android');
              }}>
              X
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/hermes/Android');
              }}>
              X
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/V8/Android');
              }}>
              X
            </a>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/JSC/iOS');
              }}>
              ✅*
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/hermes/iOS');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/V8/iOS');
              }}>
              X
            </a>
          </td>
        </tr>
        <tr>
          <td rowSpan={2}>React DevTools</td>
          <td style={{ textAlign: 'center' }}>Android</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/JSC/Android');
              }}>
              ✅
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/hermes/Android');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/V8/Android');
              }}>
              ❓
            </a>
          </td>
        </tr>
        <tr>
          <td style={{ textAlign: 'center' }}>iOS</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/JSC/iOS');
              }}>
              ✅
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/hermes/iOS');
              }}>
              ❓
            </a>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/V8/iOS');
              }}>
              X
            </a>
          </td>
        </tr>
      </table>

      <h3 id="Details">Details</h3>
      {detailsMap.get(details)}
    </>
  );
}
