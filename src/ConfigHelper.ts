'use strict';
import { PropsAllowlists } from './propsAllowlists';
import { jsiConfigureProps } from './reanimated2/core';
function assertNoOverlapInLists() {
  for (const key in PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST) {
    if (key in PropsAllowlists.UI_THREAD_PROPS_WHITELIST) {
      throw new Error(
        `[Reanimated] Property \`${key}\` was whitelisted both as UI and native prop. Please remove it from one of the lists.`
      );
    }
  }
}

function configureProps(): void {
  assertNoOverlapInLists();
  jsiConfigureProps(
    Object.keys(PropsAllowlists.UI_THREAD_PROPS_WHITELIST),
    Object.keys(PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST)
  );
}

export function addWhitelistedNativeProps(
  props: Record<string, boolean>
): void {
  const oldSize = Object.keys(
    PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST
  ).length;
  PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST = {
    ...PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST,
    ...props,
  };
  if (
    oldSize !==
    Object.keys(PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST).length
  ) {
    configureProps();
  }
}

export function addWhitelistedUIProps(props: Record<string, boolean>): void {
  const oldSize = Object.keys(PropsAllowlists.UI_THREAD_PROPS_WHITELIST).length;
  PropsAllowlists.UI_THREAD_PROPS_WHITELIST = {
    ...PropsAllowlists.UI_THREAD_PROPS_WHITELIST,
    ...props,
  };
  if (
    oldSize !== Object.keys(PropsAllowlists.UI_THREAD_PROPS_WHITELIST).length
  ) {
    configureProps();
  }
}

const PROCESSED_VIEW_NAMES = new Set();

export interface ViewConfig {
  uiViewClassName: string;
  validAttributes: Record<string, unknown>;
}
/**
 * updates UI props whitelist for given view host instance
 * this will work just once for every view name
 */

export function adaptViewConfig(viewConfig: ViewConfig): void {
  const viewName = viewConfig.uiViewClassName;
  const props = viewConfig.validAttributes;

  // update whitelist of UI props for this view name only once
  if (!PROCESSED_VIEW_NAMES.has(viewName)) {
    const propsToAdd: Record<string, boolean> = {};
    Object.keys(props).forEach((key) => {
      // we don't want to add native props as they affect layout
      // we also skip props which repeat here
      if (
        !(key in PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST) &&
        !(key in PropsAllowlists.UI_THREAD_PROPS_WHITELIST)
      ) {
        propsToAdd[key] = true;
      }
    });
    addWhitelistedUIProps(propsToAdd);

    PROCESSED_VIEW_NAMES.add(viewName);
  }
}

configureProps();
