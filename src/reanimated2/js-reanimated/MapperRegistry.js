export default class MapperRegistry {
  sortedMappers = [];
  mappers = new Map();

  updatedSinceLastExecute = false;

  constructor(module) {
    this._module = module;
  }

  startMapper(mapper) {
    this.mappers.set(mapper.id, mapper);
    this.updatedSinceLastExecute = true;
  }

  stopMapper(id) {
    this.mappers.delete(id);
    this.updatedSinceLastExecute = true;
  }

  execute() {
    if (this.updatedSinceLastExecute) {
      this.updateOrder();
      this.updatedSinceLastExecute = false;
    }

    this.sortedMappers.forEach((mapper) => {
      if (mapper.dirty) {
        mapper.execute();
      }
    });
  }

  updateOrder() {
    class Node {
      mapper = null;
      children = [];

      constructor(mapper, parents = [], children = []) {
        this.mapper = mapper;
        this.children = children;
      }
    }

    const nodes = [...this.mappers.values()].map((mapper) => new Node(mapper));

    const mappersById = {};
    this.mappers.forEach((mapper) => {
      mappersById[mapper.id] = mapper;
    });

    // create a graph from array of nodes
    nodes.forEach((node) => {
      if (node.mapper.outputs.length === 0) {
        return;
      }
      nodes.forEach((restNode) => {
        if (restNode.mapper.inputs.length === 0) {
          return;
        }
        // do not compare with itself
        if (node.mapper.id !== restNode.mapper.id) {
          node.mapper.outputs.forEach((output) => {
            restNode.mapper.inputs.forEach((restMapperInput) => {
              if (output._id === restMapperInput._id) {
                node.children.push(restNode);
              }
            });
          });
        }
      });
    });

    const post = {};
    let postCounter = 1;
    const dfs = (node) => {
      const index = nodes.indexOf(node);
      if (index === -1) {
        // this node has already been handled
        return;
      }
      ++postCounter;
      nodes.splice(index, 1);
      if (node.children.length === 0 && nodes.length > 0) {
        post[node.mapper.id] = postCounter++;
        dfs(nodes[0]);
        return;
      }
      node.children.forEach((childNode) => {
        dfs(childNode);
      });
      post[node.mapper.id] = postCounter++;
    };

    dfs(nodes[0]);

    const postArray = Object.keys(post).map((key) => {
      return [key, post[key]];
    });
    postArray.sort((a, b) => {
      return b[1] - a[1];
    });
    postArray.forEach(([id, post]) => {
      this.sortedMappers.push(mappersById[id]);
    });
  }

  get needRunOnRender() {
    return this.updatedSinceLastExecute;
  }
}
