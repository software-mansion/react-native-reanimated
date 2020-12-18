export default class MutableSet {
  __mutableSet = true;
  value = new Set();

  add = (item) => {
    this.value.add(item);
  };

  clear = () => {
    this.value.clear();
  };
}
