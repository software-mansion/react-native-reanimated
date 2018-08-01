import ReanimatedModule from './ReanimatedModule';

/**
 * Styles allowed to be direcly updated in native thread
 */
let NATIVE_PROPS_WHITELIST = {
  opacity: true,
  transform: true,
  /* colors */
  backgroundColor: true,
  borderRightColor: true,
  borderBottomColor: true,
  borderColor: true,
  borderEndColor: true,
  borderLeftColor: true,
  borderStartColor: true,
  borderTopColor: true,
  /* ios styles */
  shadowOpacity: true,
  shadowRadius: true,
  /* legacy android transform properties */
  scaleX: true,
  scaleY: true,
  translateX: true,
  translateY: true,
};

function configureNativeProps() {
  ReanimatedModule.configureNativeProps(Object.keys(NATIVE_PROPS_WHITELIST));
}

export function addWhitelistedNativeProps(props) {
  NATIVE_PROPS_WHITELIST = { ...NATIVE_PROPS_WHITELIST, ...props };
  configureNativeProps();
}

configureNativeProps();

const JS_PROPS_HANDLED_NATIVELY_WHITELIST = {
  borderBottomWidth: true,
  borderEndWidth: true,
  borderLeftWidth: true,
  borderRightWidth: true,
  borderStartWidth: true,
  borderTopWidth: true,
  borderWidth: true,
  bottom: true,
  flex: true,
  flexGrow: true,
  flexShrink: true,
  height: true,
  left: true,
  margin: true,
  marginBottom: true,
  marginEnd: true,
  marginHorizontal: true,
  marginLeft: true,
  marginRight: true,
  marginStart: true,
  marginTop: true,
  marginVertical: true,
  maxHeight: true,
  maxWidth: true,
  minHeight: true,
  minWidth: true,
  padding: true,
  paddingBottom: true,
  paddingEnd: true,
  paddingHorizontal: true,
  paddingLeft: true,
  paddingRight: true,
  paddingStart: true,
  paddingTop: true,
  paddingVertical: true,
  right: true,
  start: true,
  top: true,
  width: true,
  zIndex: true,
  borderBottomEndRadius: true,
  borderBottomLeftRadius: true,
  borderBottomRightRadius: true,
  borderBottomStartRadius: true,
  borderBottomWidth: true,
  borderLeftWidth: true,
  borderRadius: true,
  borderRightWidth: true,
  borderTopEndRadius: true,
  borderTopLeftRadius: true,
  borderTopRightRadius: true,
  borderTopStartRadius: true,
  borderTopWidth: true,
  borderWidth: true,
  opacity: true,
  elevation: true,
  fontSize: true,
  lineHeight: true,
  textShadowRadius: true,
  letterSpacing: true,
};
function configureJSPropsHandledNatively() {
  ReanimatedModule.configureJSPropsHandledNatively(
    Object.keys(JS_PROPS_HANDLED_NATIVELY_WHITELIST)
  );
}

configureJSPropsHandledNatively();
