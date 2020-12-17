export default class MutableSet {
  __mutableSet = true;
  value = [];

  add = (item) => {
    this.value.push(item);
  };

  clear = () => {
    this.value = [];
  };
}
