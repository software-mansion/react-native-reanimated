package com.swmansion.reanimated.layoutReanimation;

import android.app.Application;
import android.view.View;
import android.view.ViewGroup;

import com.swmansion.rnscreens.Screen;
import com.swmansion.rnscreens.ScreenContainer;

import java.util.HashMap;

interface TraversingLambda {
    public void exec(View view);
}

public class ViewTraverser {
    static View getParent(View view) {
        if (view instanceof Screen) {
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
        }
        return (View) view.getParent();
    }

    static int getChildCount(ViewGroup view) {
        if (view instanceof ScreenContainer) {
            ScreenContainer sc = (ScreenContainer) view;
            return sc.getScreenCount();
        }
        return view.getChildCount();
    }

    static View getChildAt(ViewGroup view, int i) {
        if (view instanceof ScreenContainer) {
            ScreenContainer sc = (ScreenContainer) view;
            Screen screen = (Screen) sc.getScreenAt(i);
            return screen;
        }
        return view.getChildAt(i);
    }

    static View attach(View view, View parentCan, View highestKnownView, HashMap<String, Object> startValues) {
        if (parentCan instanceof ViewGroup) {
            ViewGroup parent = (ViewGroup) parentCan;
            if (view instanceof Screen) {
                Screen screen = (Screen) view;
                if (view.getParent() != null) {
                    ((ViewGroup)view.getParent()).removeView(view);
                }
                ViewGroup container = (ViewGroup) highestKnownView;
                screen.setContainer(null);
                container.addView(screen);
                // convert origin
                int l = ((Number)startValues.get(Snapshooter.originX)).intValue();
                int t = ((Number)startValues.get(Snapshooter.originY)).intValue();
                int r = ((Number)startValues.get(Snapshooter.width)).intValue() + l;
                int b = ((Number)startValues.get(Snapshooter.height)).intValue() + t;
                startValues.put(Snapshooter.originX, l);
                startValues.put(Snapshooter.originY, t);
                view.measure(
                        View.MeasureSpec.makeMeasureSpec(r-l, View.MeasureSpec.EXACTLY),
                        View.MeasureSpec.makeMeasureSpec(b-t, View.MeasureSpec.EXACTLY));
                view.layout(l, t, r, b);
                highestKnownView.requestLayout();
                return container;
            }
            parent.addView(view);
            return parent;
        }
        return null;
    }

    static void traverse(View view, TraversingLambda lambda) {
        if (!(view instanceof AnimatedRoot)) {
            return;
        }
        AnimatedRoot root = (AnimatedRoot)view;
        int depth = (int)1e9;
        internalTraverse(root, lambda, depth, false);
    }

    static void internalTraverse(View view, TraversingLambda lambda, int depth, boolean shouldSkipAnimationRoots) {
        if ((view instanceof AnimatedRoot) && shouldSkipAnimationRoots) {
            return;
        }

        if (depth == 0) {
            return;
        }

        if (view instanceof ViewGroup) {
            ViewGroup viewGroup = (ViewGroup)view;
            for  (int i = 0; i < getChildCount(viewGroup); ++i) {
                internalTraverse(getChildAt(viewGroup, i), lambda,depth - 1, false);
            }
        }

        lambda.exec(view);
    }
}
