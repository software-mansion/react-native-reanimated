import React from 'react';
import { detailsMap } from './details_map';

export default function DebuggingInfoTable() {
  const [details, setDetails] = React.useState('');

  return (
    <>
      <table>
        <tr>
          <th>Tool</th>
          <th>JSC</th>
          <th>Hermes</th>
          <th>V8</th>
        </tr>
        <tr>
          <td>Chrome debugger</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/JSC/Android');
              }}>
              Android*
            </a>{' '}
            ✅<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/JSC/iOS');
              }}>
              iOS*
            </a>{' '}
            ✅<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDebugger/V8/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
        </tr>
        <tr>
          <td>Chrome DevTools</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/JSC/Android');
              }}>
              Android
            </a>{' '}
            X<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/V8/Android');
              }}>
              Android
            </a>{' '}
            X<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('chromeDevTools/V8/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
        </tr>
        <tr>
          <td>Flipper (Hermes debugger)</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/JSC/Android');
              }}>
              Android
            </a>{' '}
            X<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('flipper/V8/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
        </tr>
        <tr>
          <td>Safari DevTools</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/JSC/Android');
              }}>
              Android
            </a>{' '}
            X<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/JSC/iOS');
              }}>
              iOS*
            </a>{' '}
            ✅<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/hermes/Android');
              }}>
              Android
            </a>{' '}
            X<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/V8/Android');
              }}>
              Android
            </a>{' '}
            X<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('safariDevTools/V8/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
        </tr>
        <tr>
          <td>React DevTools</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/JSC/Android');
              }}>
              Android
            </a>{' '}
            ✅<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ✅<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href="#Details"
              onClick={() => {
                setDetails('reactDevTools/V8/iOS');
              }}>
              iOS
            </a>{' '}
            X<br></br>
          </td>
        </tr>
      </table>

      <h3 id="Details">Details</h3>
      {detailsMap.get(details)}
    </>
  );
}
