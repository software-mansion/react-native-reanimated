import React from 'react';
import { StyleSheet, View, Button, Text } from 'react-native';
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  type WorkletRuntime,
  createSynchronizable,
} from 'react-native-worklets';
import axios from 'axios';

export default function App() {
  let elephantRuntime: WorkletRuntime;

  let giraffeRuntime: WorkletRuntime;

  let monkeyRuntime: WorkletRuntime;

  const shouldStop = createSynchronizable(false);

  function testXHR(
    readystateHandler: boolean,
    progressHandler: boolean,
    arraybuffer: boolean,
    chunked: boolean
  ) {
    'worklet';
    const xhr = new globalThis.XMLHttpRequest();

    const state = {
      readystateHandler,
      progressHandler,
      arraybuffer,
      chunked,
      downloading: false,
      contentLength: 1,
      responseLength: 0,
      progressTotal: 1,
      progressLoaded: 0,
      cancelled: false,
    };

    const onreadystatechange = () => {
      if (xhr.readyState === xhr.HEADERS_RECEIVED) {
        const contentLength = parseInt(
          xhr.getResponseHeader('Content-Length')!,
          10
        );
        state.contentLength = contentLength;
        state.responseLength = 0;
      } else if (xhr.readyState === xhr.LOADING && xhr.response) {
        state.responseLength = (xhr.response as Record<string, unknown>)
          .length as number;
      }
    };
    const onprogress = (event: ProgressEvent) => {
      state.progressTotal = event.total;
      state.progressLoaded = event.loaded;
    };
    const onerror = (event: ProgressEvent) => {
      state.downloading = false;
      throw new Error(
        `XHR error: ${event.type} - ${xhr.status} - ${xhr.responseText} - ${event.toString()}`
      );
    };

    if (state.readystateHandler) {
      xhr.onreadystatechange = onreadystatechange;
    }
    if (state.progressHandler) {
      xhr.onprogress = onprogress;
    }
    if (state.arraybuffer) {
      xhr.responseType = 'arraybuffer';
    }
    xhr.onerror = onerror;
    xhr.onload = () => {
      state.downloading = false;
      if (state.cancelled) {
        state.cancelled = false;
        return;
      }
      if (xhr.status === 200) {
        let responseType = `Response is a string, ${(xhr.response as Record<string, unknown>).length as number} characters long.`;
        if (xhr.response instanceof ArrayBuffer) {
          responseType = `Response is an ArrayBuffer, ${xhr.response.byteLength} bytes long.`;
        }
        console.log('Download complete!', responseType);
      } else if (xhr.status !== 0) {
        console.error(
          `Server returned HTTP status of ${xhr.status}: ${xhr.responseText}`
        );
      } else {
        console.error(xhr.responseText);
      }
    };
    if (state.chunked) {
      xhr.open(
        'GET',
        'https://filesamples.com/samples/ebook/azw3/Around%20the%20World%20in%2028%20Languages.azw3'
      );
    } else {
      xhr.open(
        'GET',
        'https://filesamples.com/samples/document/txt/sample3.txt'
      );
      // Avoid gzip so we can actually show progress
      xhr.setRequestHeader('Accept-Encoding', '');
    }
    xhr.send();

    state.downloading = true;
  }

  function testFetch(
    runtime: WorkletRuntime,
    runtimes: {
      elephant: WorkletRuntime;
      giraffe: WorkletRuntime;
      monkey: WorkletRuntime;
    },
    count: number
  ) {
    'worklet';
    if (count > 8) {
      return;
    }

    axios({
      method: 'get',
      url: `https://jsonplaceholder.typicode.com/todos/${count}`,
    })
      .then((response) => {
        console.log(`Received ${count} response on ${runtime.name}`);
        console.log(response.data);
      })
      .catch((error) => {
        shouldStop.setBlocking(true);
        console.error('Axios error:', error);
      });
    if (count > 8) {
      return;
    }

    const nextRuntime =
      runtime.name === runtimes.elephant.name
        ? runtimes.giraffe
        : runtime.name === runtimes.giraffe.name
          ? runtimes.monkey
          : runtimes.elephant;

    setTimeout(() => {
      if (!shouldStop.getDirty()) {
        scheduleOnRuntime(
          nextRuntime,
          testFetch,
          nextRuntime,
          runtimes,
          count + 1
        );
      }
    }, 100);
  }

  function initializeRuntimes() {
    if (!elephantRuntime) {
      elephantRuntime = createWorkletRuntime({
        name: 'elephant',
      });
      giraffeRuntime = createWorkletRuntime({
        name: 'giraffe',
      });
      monkeyRuntime = createWorkletRuntime({
        name: 'monkey',
      });
    }
  }

  function testWebSocket() {
    'worklet';
    const socket = new WebSocket('ws://localhost:8080');

    socket.addEventListener('open', () => {});
  }
  return (
    <View style={styles.container}>
      <Text>Check console output</Text>
      <Button
        title="Test fetch chain"
        onPress={() => {
          initializeRuntimes();
          shouldStop.setBlocking(false);
          scheduleOnRuntime(
            elephantRuntime,
            testFetch,
            elephantRuntime,
            {
              elephant: elephantRuntime,
              giraffe: giraffeRuntime,
              monkey: monkeyRuntime,
            },
            1
          );
        }}
      />
      <Button
        title="Test XHR"
        onPress={() => {
          initializeRuntimes();
          scheduleOnRuntime(
            elephantRuntime,
            testXHR,
            false,
            false,
            false,
            false
          );
          scheduleOnRuntime(giraffeRuntime, testXHR, true, false, false, false);
          scheduleOnRuntime(monkeyRuntime, testXHR, true, true, false, false);
          scheduleOnRuntime(elephantRuntime, testXHR, true, true, true, false);
          scheduleOnRuntime(giraffeRuntime, testXHR, true, true, true, true);
        }}
      />
      <Button
        title="Test WebSocket (not implemented)"
        onPress={() => {
          scheduleOnRuntime(elephantRuntime, testWebSocket);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
