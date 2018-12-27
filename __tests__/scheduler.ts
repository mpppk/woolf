import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { LambdaFunction } from 'lamool/src/lambda';
import {forEach} from 'p-iteration';
import { IWoolfPayload } from '../src/models';
import { Woolf } from '../src/woolf';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10'
};


interface ISleepPayload {
  sleepTime: number
}

interface ISleepResult {
  sleepTime: number;
}

const generateAsyncSleepFunc: (time: number) => LambdaFunction<IWoolfPayload<ISleepPayload>, ISleepResult> = (time: number) => {
  const funcStr = `
  setTimeout(() => {
    cb(null, {
      sleepTime: event.data.reduce((a, b) => a+b.sleepTime, 0) + ${time}
    })
  }, ${time});`;
  return Function('event', 'context', 'cb', funcStr) as LambdaFunction<IWoolfPayload<ISleepPayload>, ISleepResult>;
};

describe('woolf workflow', () => {
  let lamool = new Lamool();
  let woolf: Woolf;

  beforeEach(() => {
    lamool.terminate(true);
    lamool = new Lamool();
    woolf = new Woolf(lamool, {defaultCreateFunctionRequest});
  });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute serial jobs', async () => {
    const job0 = woolf.newJob();
    await job0.addFunc<ISleepPayload, ISleepResult>(generateAsyncSleepFunc(10)); // FIXME
    const job1 = woolf.newJob();
    await job1.addFunc<ISleepPayload, ISleepResult>(generateAsyncSleepFunc(20)); // FIXME
    woolf.addDependency(job0, job1);
    const result = (await woolf.run({ data: [{ sleepTime: 0 }] })) as ISleepResult[];
    expect(result).toHaveLength(1);
    expect(result[0].sleepTime).toBe(30);
  });

  it('execute parallel jobs', async () => {
    const job0 = woolf.newJob();
    await job0.addFunc<ISleepPayload, ISleepResult>(generateAsyncSleepFunc(10)); // FIXME
    const job1 = woolf.newJob();
    await job1.addFunc<ISleepPayload, ISleepResult>(generateAsyncSleepFunc(20)); // FIXME
    const result = (await woolf.run({ data: [{ sleepTime: 0 }] })) as ISleepResult[];
    expect(result).toHaveLength(2);
    expect(result[0].sleepTime).toBe(10);
    expect(result[1].sleepTime).toBe(20);
  });

  it('execute complexity workflow', async () => {
    // https://medium.com/@pavloosadchyi/parallel-running-dag-of-tasks-in-pythons-celery-4ea73c88c915
    const jobs = Array.from({ length: 14 }, (_, k) => k).map(_ => woolf.newJob());
    jobs.forEach(job => job.addFunc<ISleepPayload, ISleepResult>(generateAsyncSleepFunc(1)));
    await forEach(jobs, async (job) => await job.addFunc<ISleepPayload, ISleepResult>(generateAsyncSleepFunc(1)));
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

    const result = (await woolf.run({ data: [{ sleepTime: 0 }] })) as ISleepResult[];
    expect(result).toHaveLength(1);
    expect(result[0].sleepTime).toBe(14);
  });
});
