export interface INode {
  id: number
}

export class DAG<Node extends INode> {
  private nodes: Map<number, Node> = new Map();
  private toNodes: Map<number, Node[]> = new Map();
  private fromNodes: Map<number, Node[]> = new Map();
  private maxID = 0;
  public getNewID(): number {
    return this.maxID++;
  }

  public addNode(node: Node) {
    if (this.nodes.has(node.id)) {
      throw new Error('specified id node already exist: ' + node.id);
    }
    this.nodes.set(node.id, node);
  }

  public addNodes(nodes: Node[]) {
    nodes.forEach((node) => this.addNode(node));
  }

  public addEdge(from: Node, to: Node): void {
    this.addToNodes(from, to);
    this.addFromNodes(from, to);
  }

  public getToNodes(from: Node): Node[] {
    const edges = this.toNodes.get(from.id);
    return edges === undefined ? [] : edges;
  }

  public getFromNodes(from: Node): Node[] {
    const edges = this.fromNodes.get(from.id);
    return edges === undefined ? [] : edges;
  }

  public getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  public topologicalSort(): Node[] {
    const visited: Map<number, boolean> = new Map(
      Array.from(this.nodes.keys()).map((id) => [id, false] as [number, boolean])
    );
    const stack: Node[] = [];
    for (const node of Array.from(this.nodes.values())) {
      if (!visited.get(node.id)) {
        this.topologicalSortUtil(node, visited, stack);
      }
    }
    return stack;
  }

  private addToNodes(from: Node, to: Node) {
    const toNodes = this.toNodes.get(from.id);
    if (toNodes === undefined) {
      this.toNodes.set(from.id, [to]);
      return;
    }

    if (toNodes.find((edge) => edge.id === to.id) === undefined) {
      toNodes.push(to);
    }
  }

  private addFromNodes(from: Node, to: Node) {
    const fromNodes = this.fromNodes.get(to.id);
    if (fromNodes === undefined) {
      this.fromNodes.set(to.id, [from]);
      return;
    }

    if (fromNodes.find((edge) => edge.id === from.id) === undefined) {
      fromNodes.push(to);
    }
  }

  private topologicalSortUtil(node: Node, visited: Map<number, boolean>, stack: Node[]) {
    visited.set(node.id, true);
    const edges = this.toNodes.get(node.id) ? this.toNodes.get(node.id)! : [];

    for (const edge of edges) {
      if (!visited.get(edge.id)) {
        this.topologicalSortUtil(edge, visited, stack);
      }
    }
    stack.unshift(node);
  }
}
