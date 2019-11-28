package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableType;

public class ReanimatedDynamic implements Dynamic {
    private Dynamic value;

    ReanimatedDynamic(Dynamic value) {
        this.value = value;
    }

    public Object value() {
        switch (value.getType()) {
            case Boolean:
                return ReflectionUtils.toDouble(value.asBoolean());
            case Null:
                //return ReflectionUtils.toDouble(0.);
                return null;
            case Number:
                return ReflectionUtils.toDouble(value.asDouble());
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
        return value.isNull();
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
    public ReanimatedWritableArray asArray() {
        return ReanimatedWritableArray.fromArray(value.asArray());
    }

    @Override
    public ReanimatedWritableMap asMap() {
        return ReanimatedWritableMap.fromMap(value.asMap());
    }

    @Override
    public String asString() {
        return value.asString();
    }

    @Override
    public int hashCode() {
        return super.hashCode();
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
