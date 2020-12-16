export default class MutableSet {
  __mutableSet = true;
  setItems = [];

  add = (item) => {
    this.setItems.push(item);
  };

  clear = () => {
    this.setItems = [];
  };
}
