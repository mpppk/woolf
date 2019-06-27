import { Lamool } from 'lamool';
import { Job, JobFuncStat } from '../src/job';
import { IJobStat, JobState, Scheduler } from '../src/scheduler/scheduler';
import { countUpLambdaFunction, generateDefaultFuncStat } from './utils/utils';

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

    job0.environment = 'local';
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

    const expectedFuncStats1ForJob0: JobFuncStat[] = [
      {
        ...generateDefaultFuncStat(),
        Code: countUpLambdaFunction,
        FunctionName: 'job0-function0'
      }
    ];
    const expectedFuncStats1ForJob1: JobFuncStat[] = [
      {
        ...generateDefaultFuncStat(),
        Code: countUpLambdaFunction,
        FunctionName: 'job1-function0'
      }
    ];

    const expectedStats1: IJobStat[] = [
      {
        environment: 'pending',
        fromJobIDs: [],
        funcs: expectedFuncStats1ForJob0,
        id: 0,
        isStartJob: true,
        isTerminusJob: false,
        name: 'job0',
        state: JobState.Ready,
        toJobIDs: [1]
      },
      {
        environment: 'pending',
        fromJobIDs: [0],
        funcs: expectedFuncStats1ForJob1,
        id: 1,
        isStartJob: false,
        isTerminusJob: true,
        name: 'job1',
        state: JobState.Suspend,
        toJobIDs: []
      }
    ];
    expect(scheduler.stats()).toEqual(expect.arrayContaining(expectedStats1));

    scheduler.startJob(job0);
    job0.environment = 'local';

    const expectedStats2: IJobStat[] = [
      {
        environment: 'local',
        fromJobIDs: [],
        funcs: expectedFuncStats1ForJob0,
        id: 0,
        isStartJob: true,
        isTerminusJob: false,
        name: 'job0',
        state: JobState.Processing,
        toJobIDs: [1]
      },
      {
        environment: 'pending',
        fromJobIDs: [0],
        funcs: expectedFuncStats1ForJob1,
        id: 1,
        isStartJob: false,
        isTerminusJob: true,
        name: 'job1',
        state: JobState.Suspend,
        toJobIDs: []
      }
    ];
    expect(scheduler.stats()).toEqual(expect.arrayContaining(expectedStats2));

    scheduler.doneJob(job0, {});
    const expectedStats3: IJobStat[] = [
      {
        environment: 'local',
        fromJobIDs: [],
        funcs: expectedFuncStats1ForJob0,
        id: 0,
        isStartJob: true,
        isTerminusJob: false,
        name: 'job0',
        state: JobState.Done,
        toJobIDs: [1]
      },
      {
        environment: 'pending',
        fromJobIDs: [0],
        funcs: expectedFuncStats1ForJob1,
        id: 1,
        isStartJob: false,
        isTerminusJob: true,
        name: 'job1',
        state: JobState.Ready,
        toJobIDs: []
      }
    ];
    expect(scheduler.stats()).toEqual(expect.arrayContaining(expectedStats3));
  });
});
