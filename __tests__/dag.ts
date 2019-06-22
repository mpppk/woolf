import { DAG, INode } from '../src/scheduler/dag';

describe('DAG', () => {
  let dag: DAG<INode>;

  beforeEach(() => {
    dag = new DAG<INode>();
  });

  it('can add nodes and edges', async () => {
    //     1
    //   /   \
    // 0       3 - 4
    //   \   /
    //     2
    const nodes = Array.from({ length: 5 }, (_, k) => k).map(_ => ({ id: dag.getNewID() }));
    nodes.forEach(node => dag.addNode(node));
    dag.addEdge(nodes[0], nodes[1]);
    dag.addEdge(nodes[0], nodes[2]);
    dag.addEdge(nodes[1], nodes[3]);
    dag.addEdge(nodes[2], nodes[3]);
    dag.addEdge(nodes[3], nodes[4]);
    expect(dag.getNodes()).toEqual(expect.arrayContaining([nodes[0], nodes[1], nodes[3]]));

    expect(dag.getToNodes(nodes[0])).toHaveLength(2);
    expect(dag.getToNodes(nodes[0])).toEqual(expect.arrayContaining([nodes[1], nodes[2]]));
    expect(dag.getToNodes(nodes[1])).toHaveLength(1);
    expect(dag.getToNodes(nodes[1])).toEqual(expect.arrayContaining([nodes[3]]));
    expect(dag.getToNodes(nodes[2])).toHaveLength(1);
    expect(dag.getToNodes(nodes[2])).toEqual(expect.arrayContaining([nodes[3]]));
    expect(dag.getToNodes(nodes[3])).toHaveLength(1);
    expect(dag.getToNodes(nodes[3])).toEqual(expect.arrayContaining([nodes[4]]));
    expect(dag.getToNodes(nodes[4])).toHaveLength(0);

    expect(dag.getFromNodes(nodes[0])).toHaveLength(0);
    expect(dag.getFromNodes(nodes[1])).toHaveLength(1);
    expect(dag.getFromNodes(nodes[1])).toEqual(expect.arrayContaining([nodes[0]]));
    expect(dag.getFromNodes(nodes[2])).toHaveLength(1);
    expect(dag.getFromNodes(nodes[2])).toEqual(expect.arrayContaining([nodes[0]]));
    expect(dag.getFromNodes(nodes[3])).toHaveLength(2);
    expect(dag.getFromNodes(nodes[3])).toEqual(expect.arrayContaining([nodes[1], nodes[2]]));
    expect(dag.getFromNodes(nodes[4])).toHaveLength(1);
    expect(dag.getFromNodes(nodes[4])).toEqual(expect.arrayContaining([nodes[3]]));
  });

  it('can return terminus nodes', async () => {
    //     1
    //   /   \
    // 0       3
    //   \   /
    //     2
    const nodes = Array.from({ length: 4 }, (_, k) => k).map(_ => ({ id: dag.getNewID() }));
    // nodes.forEach((node) => dag.addNode(node));
    dag.addNode(nodes[0]);
    let terminusNodes = dag.getTerminusNodes();
    expect(terminusNodes).toHaveLength(1);
    expect(terminusNodes[0]).toEqual({ id: 0 });

    dag.addNode(nodes[1]);
    dag.addEdge(nodes[0], nodes[1]);
    terminusNodes = dag.getTerminusNodes();
    expect(terminusNodes).toHaveLength(1);
    expect(terminusNodes[0]).toEqual({ id: 1 });

    dag.addNode(nodes[2]);
    dag.addEdge(nodes[0], nodes[2]);
    terminusNodes = dag.getTerminusNodes();
    expect(terminusNodes).toHaveLength(2);
    expect(terminusNodes).toEqual(expect.arrayContaining([{ id: 1 }, { id: 2 }]));

    dag.addNode(nodes[3]);
    dag.addEdge(nodes[1], nodes[3]);
    terminusNodes = dag.getTerminusNodes();
    expect(terminusNodes).toHaveLength(2);
    expect(terminusNodes).toEqual(expect.arrayContaining([{ id: 2 }, { id: 3 }]));

    dag.addEdge(nodes[2], nodes[3]);
    terminusNodes = dag.getTerminusNodes();
    expect(terminusNodes).toHaveLength(1);
    expect(terminusNodes[0]).toEqual({ id: 3 });
  });
});
