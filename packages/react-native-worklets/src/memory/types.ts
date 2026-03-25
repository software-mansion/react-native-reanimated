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
 * [registerCustomSerializable](https://docs.swmansion.com/react-native-worklets/docs/memory/registerCustomSerializable)
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
   * Serialization](https://docs.swmansion.com/react-native-worklets/docs/memory/serializable#supported-types).
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

/**
 * A worklet that takes the created {@link ShareableHost} and decorates it with
 * additional properties or methods. It must return the same reference it
 * received.
 */
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

/**
 * A worklet that decorates each {@link ShareableGuest} created for the Shareable
 * with additional properties or methods. It must return the same reference it
 * received.
 */
export type ShareableGuestDecorator<TValue = unknown, TDecorated = unknown> = (
  shareable: ShareableGuest<TValue> & TDecorated
) => ShareableGuest<TValue> & TDecorated;

/**
 * The host-side representation of a {@link Shareable}, living on the
 * {@link https://docs.swmansion.com/react-native-worklets/docs/fundamentals/runtimeKinds#worklet-runtime | Worklet Runtime}
 * that hosts the Shareable.
 */
export type ShareableHost<
  TValue = unknown,
  THostDecorated = unknown,
> = ShareableHostMeta &
  ShareableHostProps<TValue> &
  (THostDecorated extends object ? THostDecorated : object);

/**
 * A guest-side representation of a {@link Shareable}, used on any runtime other
 * than the host runtime.
 */
export type ShareableGuest<
  TValue = unknown,
  TGuestDecorated = unknown,
> = ShareableGuestMeta &
  ShareableGuestProps<TValue> &
  (TGuestDecorated extends object ? TGuestDecorated : object);

/**
 * A type of shared memory tied to a given runtime, called the Host Runtime.
 * Depending on the context it's either a {@link ShareableHost} (on the hosting
 * Worklet Runtime) or a {@link ShareableGuest} (on every other runtime).
 *
 * @see {@link https://docs.swmansion.com/react-native-worklets/docs/memory/shareable | Shareable docs}
 */
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

/** Optional advanced configuration for a {@link Shareable}. */
export type ShareableConfig<TValue, THostDecorated, TGuestDecorated> = {
  /**
   * A worklet that decorates the {@link ShareableHost} with additional
   * properties or methods.
   */
  hostDecorator?: ShareableHostDecorator<TValue, THostDecorated>;
  /**
   * A worklet that decorates each {@link ShareableGuest} with additional
   * properties or methods.
   */
  guestDecorator?: ShareableGuestDecorator<TValue, TGuestDecorated>;
  /**
   * When `true`, the {@link ShareableHost} is created synchronously during the
   * call to `createShareable` instead of lazily on first access. Use this when
   * the host initialization triggers side effects that must happen eagerly.
   *
   * @defaultValue `false`
   */
  initSynchronously?: boolean;
};
