package com.swmansion.reanimated.bridging;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;

class ReanimatedDynamic implements Dynamic {
    private final Dynamic value;

    private static class DynamicFromCollection implements Dynamic {
        private final ReanimatedBridge.ReadableCollection collection;
        private final Object key;

        DynamicFromCollection(ReanimatedBridge.ReadableCollection collection, Object key) {
            this.collection = collection;
            this.key = key;
        }

        private <T> T value(ReadableType type) {
            return (T) collection.value(key, BridgingUtils.inferClass(type));
        }

        @Override
        public boolean isNull() {
            return collection.value(key) == null;
        }

        @Override
        public boolean asBoolean() {
            return value(ReadableType.Boolean);
        }

        @Override
        public double asDouble() {
            return value(ReadableType.Number);
        }

        @Override
        public int asInt() {
            return BridgingUtils.fromDouble(asDouble(), int.class);
        }

        @Override
        public ReanimatedWritableNativeArray asArray() {
            return value(ReadableType.Array);
        }

        @Override
        public ReanimatedWritableNativeMap asMap() {
            return value(ReadableType.Map);
        }

        @Override
        public String asString() {
            return value(ReadableType.String);
        }

        @Override
        public ReadableType getType() {
            return BridgingUtils.inferType(collection.value(key));
        }

        @Override
        public void recycle() {
            //  noop
        }
    }

    ReanimatedDynamic(ReanimatedBridge.ReadableCollection collection, Object key) {
        value = new DynamicFromCollection(collection, key);
    }

    ReanimatedDynamic(Dynamic value) {
        this.value = value;
    }

    public Object value() {
        switch (getType()) {
            case Boolean:
                return BridgingUtils.toDouble(asBoolean());
            case Null:
                //  should this be null safe? if soo uncomment next line
                //return BridgingUtils.toDouble(0.);
                return null;
            case Number:
                return BridgingUtils.toDouble(asDouble());
            case String:
                return asString();
            case Array:
                return asArray();
            case Map:
                return asMap();
            default:
                throw new JSApplicationIllegalArgumentException(
                        "Can not cast " + value +
                                " into " + ReadableType.class.getSimpleName()
                );
        }
    }

    @Override
    public boolean isNull() {
        return BridgingUtils.isNull(value);
    }

    @Override
    public boolean asBoolean() {
        return getType() == ReadableType.Boolean ?
                value.asBoolean() :
                value.asDouble() == 1;
    }

    @Override
    public double asDouble() {
        return getType() == ReadableType.Boolean ?
                BridgingUtils.toDouble(value.asBoolean()) :
                value.asDouble();
    }

    @Override
    public int asInt() {
        return value.asInt();
    }

    @Override
    public ReadableArray asArray() {
        return value.asArray();
    }

    @Override
    public ReadableMap asMap() {
        return value.asMap();
    }

    @Override
    public String asString() {
        return value.asString();
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }

    @Override
    public ReadableType getType() {
        return value.getType();
    }

    @Override
    public void recycle() {
        value.recycle();
    }
}
