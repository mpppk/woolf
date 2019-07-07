import { Lamool } from 'lamool';
import { IJobStat, Woolf } from '../src';
import { JobFuncStat, JobFuncState } from '../src/job';
import { JobState } from '../src/scheduler/scheduler';
import { countUpLambdaFunction, generateDefaultFuncStat } from './utils/utils';

describe('woolf workflow', () => {
  let lamool = new Lamool();
  let woolf: Woolf;

  beforeEach(async () => {
    await lamool.terminate(true);
    lamool = new Lamool();
    woolf = new Woolf(lamool);
  });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('return stats', async () => {
    const job = woolf.newJob();
    const job2 = woolf.newJob();
    woolf.addDependency(job, job2);
    await job.addFunc(countUpLambdaFunction);
    await job.addFunc(countUpLambdaFunction);
    await job2.addFunc(countUpLambdaFunction);
    await job2.addFunc(countUpLambdaFunction);
    await woolf.run({ count: 0 });
    const expectedFuncStats: JobFuncStat[] = [
      {
        ...generateDefaultFuncStat(),
        Code: countUpLambdaFunction,
        event: { count: 0 },
        payload: { count: 0 },
        rawResults: { count: 1 },
        results: { count: 1 },
        state: JobFuncState.Done
      },
      {
        ...generateDefaultFuncStat(),
        Code: countUpLambdaFunction,
        FunctionName: 'job0-function1',
        event: { count: 1 },
        payload: { count: 1 },
        rawResults: { count: 2 },
        results: { count: 2 },
        state: JobFuncState.Done
      }
    ];
    const expectedFuncStats2: JobFuncStat[] = [
      {
        ...generateDefaultFuncStat(),
        Code: countUpLambdaFunction,
        FunctionName: 'job1-function0',
        event: [{ count: 2 }],
        payload: [{ count: 2 }],
        rawResults: { count: 3 },
        results: { count: 3 },
        state: JobFuncState.Done
      },
      {
        ...generateDefaultFuncStat(),
        Code: countUpLambdaFunction,
        FunctionName: 'job1-function1',
        event: { count: 3 },
        payload: { count: 3 },
        rawResults: { count: 4 },
        results: { count: 4 },
        state: JobFuncState.Done
      }
    ];

    const expectedStats1: IJobStat[] = [
      {
        environment: 'local',
        fromJobIDs: [],
        funcs: expectedFuncStats,
        id: 0,
        isStartJob: true,
        isTerminusJob: false,
        name: 'job0',
        payload: { count: 0 },
        results: { count: 2 },
        state: JobState.Done,
        toJobIDs: [1]
      },
      {
        environment: 'local',
        fromJobIDs: [0],
        funcs: expectedFuncStats2,
        id: 1,
        isStartJob: false,
        isTerminusJob: true,
        name: 'job1',
        payload: [{ count: 2 }],
        results: { count: 4 },
        state: JobState.Done,
        toJobIDs: []
      }
    ];
    expect(woolf.stats()).toEqual(expectedStats1);
  });
});
