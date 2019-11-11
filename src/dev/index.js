//export { default as Dev } from './Dev';
const Dev = __DEV__ ? require('./Dev').default : () => null;

export {
  Dev
}