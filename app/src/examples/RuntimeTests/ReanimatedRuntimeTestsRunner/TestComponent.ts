import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

type validPropNames =
  | 'zIndex'
  | 'opacity'
  | 'width'
  | 'height'
  | 'top'
  | 'left';
export class TestComponent {
  private ref: React.MutableRefObject<any>;
  constructor(ref: React.MutableRefObject<any>) {
    this.ref = ref;
  }
  public getStyle(propName: string) {
    return this.ref.current.props.style[propName];
  }
  public async getAnimatedStyle(propName: validPropNames) {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    return getViewProp(tag, propName);
  }
  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
