import { Lamool } from 'lamool/src/lamool';
import { forEach } from 'p-iteration';
import { Woolf } from '../src/woolf';
import { countUpLambdaFunction } from './utils/utils';

interface ICountPayload {
  count: number;
}

describe('woolf workflow', () => {
  let lamool = new Lamool();
  let woolf: Woolf;

  beforeEach(() => {
    lamool.terminate(true);
    lamool = new Lamool();
    woolf = new Woolf(lamool);
  });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute serial jobs', async () => {
    const job0 = woolf.newJob();
    await job0.addFunc<ICountPayload, ICountPayload>(countUpLambdaFunction);
    const job1 = woolf.newJob();
    await job1.addFunc<ICountPayload, ICountPayload>(countUpLambdaFunction);
    woolf.addDependency(job0, job1);
    const result = await woolf.run<ICountPayload>({ count: 0 });
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it('execute parallel jobs', async () => {
    const job0 = woolf.newJob();
    await job0.addFunc<ICountPayload>(countUpLambdaFunction);
    const job1 = woolf.newJob();
    await job1.addFunc<ICountPayload>(countUpLambdaFunction);
    const result = await woolf.run({ count: 0 });
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(1);
    expect(result[1].count).toBe(1);
  });

  it('execute complexity workflow', async () => {
    // https://medium.com/@pavloosadchyi/parallel-running-dag-of-tasks-in-pythons-celery-4ea73c88c915
    const jobs = Array.from({ length: 14 }, (_, k) => k).map(_ => woolf.newJob());
    await forEach(jobs, async job => {
      await job.addFunc<ICountPayload>(countUpLambdaFunction);
    });
    //   1 - 3     6 - 9 -
    //  /     \  /        \
    // 0       5 - 7 - 10 - 12 - 13
    //  \     / \               /
    //   2 - 4   8 - 11 - - - -

    woolf.addDependency(jobs[0], jobs[1]);
    woolf.addDependency(jobs[0], jobs[2]);
    woolf.addDependency(jobs[1], jobs[3]);
    woolf.addDependency(jobs[3], jobs[5]);
    woolf.addDependency(jobs[2], jobs[4]);
    woolf.addDependency(jobs[4], jobs[5]);
    woolf.addDependency(jobs[5], jobs[7]);
    woolf.addDependency(jobs[5], jobs[6]);
    woolf.addDependency(jobs[6], jobs[9]);
    woolf.addDependency(jobs[9], jobs[12]);
    woolf.addDependency(jobs[5], jobs[7]);
    woolf.addDependency(jobs[7], jobs[10]);
    woolf.addDependency(jobs[10], jobs[12]);
    woolf.addDependency(jobs[12], jobs[13]);
    woolf.addDependency(jobs[5], jobs[8]);
    woolf.addDependency(jobs[8], jobs[11]);
    woolf.addDependency(jobs[11], jobs[13]);

    const result = await woolf.run({ count: 0 });
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(29);
  });
});
