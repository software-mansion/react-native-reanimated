package com.swmansion.reanimated.reflection;

import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;

import java.util.ArrayList;

public class ReanimatedWritableCollection extends ReanimatedWritableMap implements WritableArray {

    public static ReanimatedWritableCollection fromMap(ReadableMap source) {
        if (source instanceof ReanimatedWritableCollection) {
            return ((ReanimatedWritableCollection) source);
        } else {
            ReanimatedWritableCollection out = new ReanimatedWritableCollection();
            out.merge(source);
            return out;
        }
    }

    private String key(int index) {
        return String.valueOf(index) ;
    }

    private String nextIndex() {
        return String.valueOf(size());
    }

    private Boolean isArray() {
        return size() > 0;
    }

    @Nullable
    @Override
    public ReadableArray getArray(int index) {
        return getArray(key(index));
    }

    @Override
    public void pushArray(@Nullable ReadableArray array) {
        putArray(nextIndex(), array);
    }

    @Override
    public boolean getBoolean(int index) {
        return getBoolean(key(index));
    }

    @Override
    public void pushBoolean(boolean value) {
        putBoolean(nextIndex(), value);
    }

    @Override
    public double getDouble(int index) {
        return getDouble(key(index));
    }

    @Override
    public void pushDouble(double value) {
        putDouble(nextIndex(), value);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        return getDynamic(key(index));
    }

    public void pushDynamic(Dynamic value) {
        putDynamic(nextIndex(), value);
    }

    @Override
    public int getInt(int index) {
        return getInt(key(index));
    }

    @Override
    public void pushInt(int value) {
        putInt(nextIndex(), value);
    }

    @Nullable
    @Override
    public ReadableMap getMap(int index) {
        return getMap(key(index));
    }

    @Override
    public void pushMap(@Nullable ReadableMap map) {
        putMap(nextIndex(), map);
    }

    @Nullable
    @Override
    public String getString(int index) {
        return getString(key(index));
    }

    @Override
    public void pushString(@Nullable String value) {
        putString(nextIndex(), value);
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        return getType(key(index));
    }

    @Override
    public boolean isNull(int index) {
        return isNull(key(index));
    }

    @Override
    public void pushNull() {
        putNull(nextIndex());
    }

    @Override
    public int size() {
        ReadableMapKeySetIterator keySetIterator = keySetIterator();
        String key;
        int size = 0;

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (TextUtils.isDigitsOnly(key)) {
                size = Math.max(size, Integer.valueOf(key) + 1);
            }
        }

        return size;
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        ArrayList<Object> list = new ArrayList<>();
        ReadableMapKeySetIterator keySetIterator = keySetIterator();
        String key;
        int index;

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (TextUtils.isDigitsOnly(key)) {
                index = Integer.valueOf(key);
                list.ensureCapacity(index + 1);
                while (list.size() <= index) {
                    list.add(null);
                }
                list.set(index, new ReanimatedDynamic(getDynamic(key)).value());
            }
        }

        return list;
    }

    @NonNull
    @Override
    public String toString() {
        return isArray() ? toArrayList().toString() : super.toString();
    }
}
