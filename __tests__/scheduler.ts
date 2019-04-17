import { Lamool } from 'lamool';
import { Job } from '../src/job';
import { IJobStat, JobState, Scheduler } from '../src/scheduler/scheduler';
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

    const expectedStats1: IJobStat[] = [
      { id: 0, name: 'job0', state: JobState.Ready, toJobIDs: [1], fromJobIDs: [] },
      { id: 1, name: 'job1', state: JobState.Suspend, toJobIDs: [], fromJobIDs: [0] }
    ];
    expect(scheduler.stats()).toEqual(expect.arrayContaining(expectedStats1));

    scheduler.startJob(job0);
    const expectedStats2: IJobStat[] = [
      { id: 0, name: 'job0', state: JobState.Processing, toJobIDs: [1], fromJobIDs: [] },
      { id: 1, name: 'job1', state: JobState.Suspend, toJobIDs: [], fromJobIDs: [0] }
    ];
    expect(scheduler.stats()).toEqual(expect.arrayContaining(expectedStats2));

    scheduler.doneJob(job0, {});
    const expectedStats3: IJobStat[] = [
      { id: 0, name: 'job0', state: JobState.Done, toJobIDs: [1], fromJobIDs: [] },
      { id: 1, name: 'job1', state: JobState.Ready, toJobIDs: [], fromJobIDs: [0] }
    ];
    expect(scheduler.stats()).toEqual(expect.arrayContaining(expectedStats3));
  });
});
