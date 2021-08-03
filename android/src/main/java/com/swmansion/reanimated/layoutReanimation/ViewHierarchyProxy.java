package com.swmansion.reanimated.layoutReanimation;

import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.swmansion.rnscreens.Screen;
import com.swmansion.rnscreens.ScreenContainer;

import java.util.HashMap;

public class ViewHierarchyProxy {
    static View getParent(View view) {
       /* if (view instanceof Screen) {
            Screen screen = (Screen) view;
            ScreenContainer container = screen.getContainer();
            if (container == null || !container.hasScreen(screen.getFragment())) {
                // Screen has been deleted
                // Attached to window
                if (!screen.isAttachedToWindow()) {
                    return null;
                }
                return (View) screen.getParent();
            } else {
                return container;
            }
        }*/
        return (View) view.getParent();
    }

    static int getChildCount(ViewGroup view) {
        /*if (view instanceof ScreenContainer) {
            ScreenContainer sc = (ScreenContainer) view;
            return sc.getScreenCount();
        }*/
        return view.getChildCount();
    }

    static View getChildAt(ViewGroup view, int i) {
       /* if (view instanceof ScreenContainer) {
            ScreenContainer sc = (ScreenContainer) view;
            Screen screen = (Screen) sc.getScreenAt(i);
            return screen;
        }*/
        return view.getChildAt(i);
    }

    static View attach(View view, View parentCan, HashMap<String, Object> startValues) {
        if (parentCan instanceof ViewGroup) {
            ViewGroup parent = (ViewGroup) parentCan;
            if (view instanceof Screen) {
               /* Screen screen = (Screen) view;
                if (view.getParent() != null) {
                    ((ViewGroup)view.getParent()).removeView(view);
                }
                ViewGroup container = (ViewGroup) screen.getContainer();
                screen.setContainer(null);
                container.addView(screen);
                // convert origin
                int l = ((Number)startValues.get(Snapshot.ORIGIN_X)).intValue();
                int t = ((Number)startValues.get(Snapshot.ORIGIN_Y)).intValue();
                int r = ((Number)startValues.get(Snapshot.WIDTH)).intValue() + l;
                int b = ((Number)startValues.get(Snapshot.HEIGHT)).intValue() + t;
                startValues.put(Snapshot.ORIGIN_X, l);
                startValues.put(Snapshot.ORIGIN_Y, t);
                view.measure(
                        View.MeasureSpec.makeMeasureSpec(r-l, View.MeasureSpec.EXACTLY),
                        View.MeasureSpec.makeMeasureSpec(b-t, View.MeasureSpec.EXACTLY));
                view.layout(l, t, r, b);
                highestKnownView.requestLayout();
                return container;*/
                throw new RuntimeException("Screens should be turned off");
            }

            /*if (view instanceof FrameLayout && parent instanceof ScreenContainer) {
                return null;
            }*/

            if (view.getParent() != null) return parent;
            parent.addView(view);
            return parent;
        }
        return null;
    }
}
