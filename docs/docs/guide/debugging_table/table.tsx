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
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/JSC/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/JSC/Web');
              }}>
              Web
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/hermes/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/V8/iOS');
              }}>
              iOS
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/V8/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
        </tr>
        <tr>
          <td>Chrome DevTools</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/JSC/Android');
              }}>
              Android
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/JSC/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/hermes/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/V8/Android');
              }}>
              Android
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/V8/iOS');
              }}>
              iOS
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDevTools/V8/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
        </tr>
        <tr>
          <td>Flipper (Hermes debugger)</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/JSC/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/JSC/Web');
              }}>
              Web
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/hermes/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/V8/iOS');
              }}>
              iOS
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('flipper/V8/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
        </tr>
        <tr>
          <td>Safari DevTools</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/JSC/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/JSC/Web');
              }}>
              Web
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/hermes/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/V8/iOS');
              }}>
              iOS
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('safariDevTools/V8/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
        </tr>
        <tr>
          <td>React DevTools</td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/JSC/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/JSC/Web');
              }}>
              Web
            </a>{' '}
            ❓<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/hermes/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/hermes/iOS');
              }}>
              iOS
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/hermes/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
          <td style={{ textAlign: 'center' }}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/V8/Android');
              }}>
              Android
            </a>{' '}
            ❓<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/V8/iOS');
              }}>
              iOS
            </a>{' '}
            ❌<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('reactDevTools/V8/Web');
              }}>
              Web
            </a>{' '}
            ❌<br></br>
          </td>
        </tr>
      </table>

      <h3>Details</h3>
      {detailsMap.get(details)}
    </>
  );
}
