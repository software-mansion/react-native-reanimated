import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import {
  createWorkletRuntime,
  runOnRuntime,
  type WorkletRuntime,
} from 'react-native-worklets';
import axios from 'axios';
import { runOnUI } from 'react-native-worklets';

const mydloRuntime = createWorkletRuntime({
  name: 'mydlo',
});

const widloRuntime = createWorkletRuntime({
  name: 'widlo',
});

const powidloRuntime = createWorkletRuntime({
  name: 'powidlo',
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
      state.responseLength = xhr.response.length;
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
    // this.setState({ downloading: false });
    state.downloading = false;
    if (state.cancelled) {
      state.cancelled = false;
      return;
    }
    if (xhr.status === 200) {
      let responseType = `Response is a string, ${xhr.response.length} characters long.`;
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
    runtime.name === mydloRuntime.name
      ? widloRuntime
      : runtime.name === widloRuntime.name
        ? powidloRuntime
        : mydloRuntime;

  setTimeout(() => {
    try {
      runOnRuntime(nextRuntime, () => {
        'worklet';
        callback(nextRuntime, count + 1);
      })();
    } catch (e) {
      console.log('Error in callback', e);
      console.log('stack', (e as Error).stack);
    }
  }, 100);
}

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title="UNLEASH THE FETCH"
        onPress={() => {
          runOnRuntime(mydloRuntime, callback)(mydloRuntime, 0);
        }}
      />
      <Button
        title="Test XHR"
        onPress={() => {
          runOnRuntime(mydloRuntime, testXHR)(false, false, false, false);
          runOnRuntime(widloRuntime, testXHR)(true, false, false, false);
          runOnRuntime(powidloRuntime, testXHR)(true, true, false, false);
          runOnRuntime(mydloRuntime, testXHR)(true, true, true, false);
          runOnRuntime(widloRuntime, testXHR)(true, true, true, true);
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
