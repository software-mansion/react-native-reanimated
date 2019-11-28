package com.swmansion.reanimated.reflection;

import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;

import java.util.ArrayList;

public class ReanimatedReadableCollection  extends ReanimatedWritableMap implements ReadableArray {
    private String key(int index) {
        return String.valueOf(index) ;
    }

    @Nullable
    @Override
    public ReadableArray getArray(int index) {
        return getArray(key(index));
    }

    @Override
    public boolean getBoolean(int index) {
        return getBoolean(key(index));
    }

    @Override
    public double getDouble(int index) {
        return getDouble(key(index));
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        return getDynamic(key(index));
    }

    @Override
    public int getInt(int index) {
        return getInt(key(index));
    }

    @Nullable
    @Override
    public ReadableMap getMap(int index) {
        return getMap(key(index));
    }

    @Nullable
    @Override
    public String getString(int index) {
        return getString(key(index));
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
    public int size() {
        return 0;
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        Dynamic dynamic;
        ReadableMapKeySetIterator keySetIterator = keySetIterator();
        String key;
        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (TextUtils.isDigitsOnly(key)) {
                
            }
        }
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            putDynamic(to, String.valueOf(i), dynamic);
            dynamic.recycle();
        }

        return to;
        return null;
    }
}
