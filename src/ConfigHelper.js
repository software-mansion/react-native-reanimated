import { NativeModules } from 'react-native';

const { ReanimatedModule } = NativeModules;

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
  backgroundColor: true,
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
