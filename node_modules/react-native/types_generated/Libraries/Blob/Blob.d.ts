/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<dfe4580bf8775b4e8a6a16254468ef12>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Blob/Blob.js
 */

import type { BlobData, BlobOptions } from "./BlobTypes";
/**
 * Opaque JS representation of some binary data in native.
 *
 * The API is modeled after the W3C Blob API, with one caveat
 * regarding explicit deallocation. Refer to the `close()`
 * method for further details.
 *
 * Example usage in a React component:
 *
 *   class WebSocketImage extends React.Component {
 *      state = {blob: null};
 *      componentDidMount() {
 *        let ws = this.ws = new WebSocket(...);
 *        ws.binaryType = 'blob';
 *        ws.onmessage = (event) => {
 *          if (this.state.blob) {
 *            this.state.blob.close();
 *          }
 *          this.setState({blob: event.data});
 *        };
 *      }
 *      componentUnmount() {
 *        if (this.state.blob) {
 *          this.state.blob.close();
 *        }
 *        this.ws.close();
 *      }
 *      render() {
 *        if (!this.state.blob) {
 *          return <View />;
 *        }
 *        return <Image source={{uri: URL.createObjectURL(this.state.blob)}} />;
 *      }
 *   }
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Blob
 */
declare class Blob {
  constructor(parts?: Array<Blob | string>, options?: BlobOptions);
  set data(data: null | undefined | BlobData);
  get data(): BlobData;
  slice(start?: number, end?: number, contentType?: string): Blob;
  close(): void;
  get size(): number;
  get type(): string;
}
export default Blob;
