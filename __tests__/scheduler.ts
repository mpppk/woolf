import { Lamool } from 'lamool';
import { Job } from '../src/job';
import { JobState, Scheduler } from '../src/scheduler/scheduler';
import { countUpLambdaFunction } from './utils/utils';

// const generateAsyncSleepFunc: (time: number) => LambdaFunction<IWoolfPayload<ISleepPayload>, ISleepResult> = (time: number) => {
//   const funcStr = `
//   setTimeout(() => {
//     cb(null, {
//       sleepTime: event.data.reduce((a, b) => a+b.sleepTime, 0) + ${time}
//     })
//   }, ${time});`;
//   return Function('event', 'context', 'cb', funcStr) as LambdaFunction<IWoolfPayload<ISleepPayload>, ISleepResult>;
// };

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
    const job0 = new Job(0, lamool);
    await job0.addFunc(countUpLambdaFunction);
    scheduler.addJob(job0);
    const job1 = new Job(1, lamool);
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
    const job0 = new Job(0, lamool);
    await job0.addFunc(countUpLambdaFunction);
    scheduler.addJob(job0);
    const job1 = new Job(1, lamool);
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
