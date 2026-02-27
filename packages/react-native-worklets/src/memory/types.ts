'use strict';

/**
 * The below type is used for HostObjects returned by the JSI API that don't
 * have any accessible fields or methods but can carry data that is accessed
 * from the c++ side. We add a field to the type to make it possible for
 * typescript to recognize which JSI methods accept those types as arguments and
 * to be able to correctly type check other methods that may use them. However,
 * this field is not actually defined nor should be used for anything else as
 * assigning any data to those objects will throw an error.
 */
export type SerializableRef<TValue = unknown> = {
  __serializableRef: true;
  __nativeStateSerializableJSRef: TValue;
};

// In case of objects with depth or arrays of objects or arrays of arrays etc.
// we add this utility type that makes it a `SharaebleRef` of the outermost type.
export type FlatSerializableRef<TValue> =
  TValue extends SerializableRef<infer TRecursive>
    ? SerializableRef<TRecursive>
    : SerializableRef<TValue>;

export type SynchronizableRef<TValue = unknown> = {
  __synchronizableRef: true;
  __nativeStateSynchronizableJSRef: TValue;
};

export type Synchronizable<TValue = unknown> = SerializableRef<TValue> &
  SynchronizableRef<TValue> & {
    __synchronizableRef: true;
    getDirty(): TValue;
    getBlocking(): TValue;
    setBlocking(value: TValue | ((prev: TValue) => TValue)): void;
    lock(): void;
    unlock(): void;
  };

/**
 * Registration data for
 * [registerCustomSerializable](https://docs.swmansion.com/react-native-reanimated/docs/memory/registerCustomSerializable)
 * function.
 */
export type RegistrationData<TValue extends object, TPacked = unknown> = {
  /**
   * A unique name for the Custom Serializable. It's used to prevent duplicate
   * registrations of the same Custom Serializable. You will get warned if you
   * attempt to register a Custom Serializable with a name that has already been
   * used.
   */
  name: string;
  /**
   * A worklet that checks whether a given JavaScript value is of the type
   * handled by this Custom Serializable.
   */
  determine: (value: object) => value is TValue;
  /**
   * A worklet that packs the JavaScript value of type `TValue` into a value
   * that can be serialized by default as Serializable. The function must return
   * a [supported type for
   * Serialization](https://docs.swmansion.com/react-native-reanimated/docs/memory/Serializable#supported-types).
   */
  pack: (value: TValue) => TPacked;
  /**
   * A worklet that unpacks the packed value, after it's been deserialized from
   * it's packed form, back into the JavaScript value of type `TValue`.
   */
  unpack: (value: TPacked) => TValue;
};

export type SerializationData<TValue extends object, TPacked = unknown> = Omit<
  RegistrationData<TValue, TPacked>,
  'name'
> & {
  /** Only defined on the RN Runtime. */
  name?: string;
};

export type CustomSerializationRegistry = SerializationData<object, unknown>[];

export type ShareableHostProps<TValue = unknown> = {
  value: TValue;
};

export type ShareableHostMeta = {
  isHost: true;
  __shareableRef: true;
};

export type ShareableHostDecorator<TValue = unknown, TDecorated = unknown> = (
  shareable: ShareableHost<TValue> & TDecorated
) => ShareableHost<TValue> & TDecorated;

export type ShareableGuestMeta = {
  isHost: false;
  __shareableRef: true;
};

export type ShareableGuestProps<TValue = unknown> = {
  getAsync(): Promise<TValue>;
  getSync(): TValue;
  setAsync(value: TValue | ((prev: TValue) => TValue)): void;
  setSync(value: TValue | ((prev: TValue) => TValue)): void;
};

export type ShareableGuestDecorator<TValue = unknown, TDecorated = unknown> = (
  shareable: ShareableGuest<TValue> & TDecorated
) => ShareableGuest<TValue> & TDecorated;

export type ShareableHost<
  TValue = unknown,
  THostDecorated = unknown,
> = ShareableHostMeta &
  ShareableHostProps<TValue> &
  (THostDecorated extends object ? THostDecorated : object);

export type ShareableGuest<
  TValue = unknown,
  TGuestDecorated = unknown,
> = ShareableGuestMeta &
  ShareableGuestProps<TValue> &
  (TGuestDecorated extends object ? TGuestDecorated : object);

export type Shareable<
  TValue = unknown,
  THostDecorated = unknown,
  TGuestDecorated = unknown,
> =
  | (ShareableHost<TValue, THostDecorated> &
      Partial<
        ShareableGuestProps<TValue> &
          (TGuestDecorated extends object ? Partial<TGuestDecorated> : object)
      >)
  | (ShareableGuest<TValue, TGuestDecorated> &
      Partial<
        ShareableHostProps<TValue> &
          (THostDecorated extends object ? Partial<THostDecorated> : object)
      >);

export type ShareableConfig<TValue, THostDecorated, TGuestDecorated> = {
  hostDecorator?: ShareableHostDecorator<TValue, THostDecorated>;
  guestDecorator?: ShareableGuestDecorator<TValue, TGuestDecorated>;
  initSynchronously?: boolean;
};
