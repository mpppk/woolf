import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { LambdaFunction } from 'lamool/src/lambda';
import {forEach} from 'p-iteration';
import { Job } from '../src/job';
import { IWoolfPayload } from '../src/models';
import { JobState, Scheduler } from '../src/scheduler/scheduler';
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

interface ICountPayload {
  count: number;
}

const countUpLambdaFunction: LambdaFunction<IWoolfPayload<ICountPayload>, ICountPayload> = (e, _, cb) => {
  cb(null, {count: e.data.reduce((a, b) => a+b.count, 1)});
};

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
    await forEach(jobs, async (job) => {
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

    const result = (await woolf.run({ data: [{ count: 0 }] })) as ICountPayload[];
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(29);
  });
});

describe('scheduler', () => {
  let scheduler = new Scheduler();
  let lamool = new Lamool();

  beforeEach(() => {
    lamool.terminate(true);
    lamool = new Lamool();
    scheduler = new Scheduler();
  });

  afterAll(async () => {
    lamool.terminate(true);
  });

  it('handle job status', async () => {
    const job0 = new Job(0, lamool, defaultCreateFunctionRequest);
    await job0.addFunc(countUpLambdaFunction);
    scheduler.addJob(job0);
    const job1 = new Job(1, lamool, defaultCreateFunctionRequest);
    await job1.addFunc(countUpLambdaFunction);
    scheduler.addJob(job1);
    scheduler.addDependency(job0, job1);

    expect(scheduler.isDoneJob(job0)).toBeFalsy();
    expect(scheduler.isReadiedJob(job0)).toBeTruthy();
    expect(scheduler.isSuspendedJob(job0)).toBeFalsy();
    expect(scheduler.isDoneJob(job1)).toBeFalsy();
    expect(scheduler.isReadiedJob(job1)).toBeFalsy();
    expect(scheduler.isSuspendedJob(job1)).toBeTruthy();

    scheduler.doneJob(job0, {});
    expect(scheduler.isDoneJob(job0)).toBeTruthy();
    expect(scheduler.isReadiedJob(job0)).toBeFalsy();
    expect(scheduler.isSuspendedJob(job0)).toBeFalsy();
    expect(scheduler.isDoneJob(job1)).toBeFalsy();
    expect(scheduler.isReadiedJob(job1)).toBeTruthy();
    expect(scheduler.isSuspendedJob(job1)).toBeFalsy();
  });

  it('return job stats', async () => {
    const job0 = new Job(0, lamool, defaultCreateFunctionRequest);
    await job0.addFunc(countUpLambdaFunction);
    scheduler.addJob(job0);
    const job1 = new Job(1, lamool, defaultCreateFunctionRequest);
    await job1.addFunc(countUpLambdaFunction);
    scheduler.addJob(job1);
    scheduler.addDependency(job0, job1);

    const statsSummary1 = scheduler.stats().map(s => ({id: s.job.id, state: s.state, waitingJobIDs: s.waitingJobIDs}));
    const expectedStats1 = [
      {id: 0, state: JobState.Ready, waitingJobIDs: []},
      {id: 1, state: JobState.Suspend, waitingJobIDs: [0]},
    ];
    expect(statsSummary1).toEqual(expect.arrayContaining(expectedStats1));

    scheduler.doneJob(job0, {});
    const statsSummary2 = scheduler.stats().map(s => ({id: s.job.id, state: s.state}));
    const expectedStats2 = [
      {id: 0, state: JobState.Done},
      {id: 1, state: JobState.Ready},
    ];
    expect(statsSummary2).toEqual(expect.arrayContaining(expectedStats2))
  });
});
