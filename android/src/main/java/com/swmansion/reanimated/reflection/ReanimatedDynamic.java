package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;

class ReanimatedDynamic implements Dynamic {
    private final Dynamic value;

    private static class DynamicFromCollection implements Dynamic {
        private final ReadableCollection collection;
        private final Object key;

        DynamicFromCollection(ReadableCollection collection, Object key) {
            this.collection = collection;
            this.key = key;
        }


        private <T> T value(ReadableType type) {
            return (T) collection.value(key, ReflectionUtils.inferClass(type));
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
            return ReflectionUtils.fromDouble(asDouble(), int.class);
        }

        @Override
        public ReanimatedNativeArray asArray() {
            return value(ReadableType.Array);
        }

        @Override
        public ReanimatedNativeMap asMap() {
            return value(ReadableType.Map);
        }

        @Override
        public String asString() {
            return value(ReadableType.String);
        }

        @Override
        public ReadableType getType() {
            return ReflectionUtils.inferType(collection.value(key));
        }

        @Override
        public void recycle() {

        }
    }

    ReanimatedDynamic(ReadableCollection collection, Object key) {
        value = new DynamicFromCollection(collection, key);
    }

    ReanimatedDynamic(Dynamic value) {
        this.value = value;
    }

    public Object value() {
        switch (getType()) {
            case Boolean:
                return ReflectionUtils.toDouble(asBoolean());
            case Null:
                //  should this be null safe? if soo uncomment next line
                //return ReflectionUtils.toDouble(0.);
                return null;
            case Number:
                return ReflectionUtils.toDouble(asDouble());
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
        return ReflectionUtils.isNull(value);
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
                ReflectionUtils.toDouble(value.asBoolean()) :
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
