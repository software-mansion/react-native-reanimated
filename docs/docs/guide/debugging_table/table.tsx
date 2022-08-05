import React from 'react';
import {
  chromeDevToolsAndroid,
  chromeDevToolsiOS,
  chromeDevToolsWeb,
} from './details';

const detailsMap = new Map<string, string>([
  ['', ''],
  ['chromeDebugger/JSC/Android', chromeDevToolsAndroid],
  ['chromeDebugger/JSC/iOS', chromeDevToolsiOS],
  ['chromeDebugger/JSC/Web', chromeDevToolsWeb],
]);

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
            ✅<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/JSC/iOS');
              }}>
              iOS
            </a>{' '}
            ✅<br></br>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                setDetails('chromeDebugger/JSC/Web');
              }}>
              Web
            </a>{' '}
            ✅
          </td>
          <td style={{ textAlign: 'center' }}>
            Android ✅ <br></br>
            iOS ✅ <br></br>
            Web ✅
          </td>
          <td style={{ textAlign: 'center' }}>
            Android ✅ <br></br>
            iOS ✅ <br></br>
            Web ✅
          </td>
        </tr>
        <tr>
          <td>Chrome devtools</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>Flipper</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>Safari</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </table>

      <p>{detailsMap.get(details)}</p>
    </>
  );
}
