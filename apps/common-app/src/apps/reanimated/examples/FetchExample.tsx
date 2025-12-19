import React from 'react';
import { StyleSheet, View, Button, TurboModuleRegistry } from 'react-native';
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  type WorkletRuntime,
} from 'react-native-worklets';
import axios from 'axios';

console.log(TurboModuleRegistry.get('BlobModule')?.getConstants());

const elephantRuntime = createWorkletRuntime({
  name: 'elephant',
});

const giraffeRuntime = createWorkletRuntime({
  name: 'giraffe  ',
});

const monkeyRuntime = createWorkletRuntime({
  name: 'monkey',
});

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
    xhr.open('GET', 'https://filesamples.com/samples/document/txt/sample3.txt');
    // Avoid gzip so we can actually show progress
    xhr.setRequestHeader('Accept-Encoding', '');
  }
  xhr.send();

  state.downloading = true;
}

function callback(runtime: WorkletRuntime, count: number) {
  'worklet';
  axios({
    method: 'get',
    url: 'https://tomekzaw.pl',
  })
    .then((response) => {
      console.log(`Received ${count} response on ${runtime.name}`);
      console.log(response.data);
    })
    .catch((error) => {
      console.error('Axios error:', error);
    });
  if (count > 32) {
    return;
  }

  const nextRuntime =
    runtime.name === elephantRuntime.name
      ? giraffeRuntime
      : runtime.name === giraffeRuntime.name
        ? monkeyRuntime
        : elephantRuntime;

  setTimeout(() => {
    scheduleOnRuntime(nextRuntime, callback, nextRuntime, count + 1);
  }, 100);
}

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title="Test fetch chain"
        onPress={() => {
          scheduleOnRuntime(elephantRuntime, callback, elephantRuntime, 0);
        }}
      />
      <Button
        title="Test XHR"
        onPress={() => {
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
