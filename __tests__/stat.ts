// import _ = require('lodash');
import { IJobStat } from '../src';
import { JobFuncStat } from '../src/job';
import { JobState } from '../src/scheduler/scheduler';
import { StatManager } from '../src/statManager';
import { countUpLambdaFunction, generateDefaultFuncStat } from './utils/utils';

const funcStats: JobFuncStat[] = [
  {
    ...generateDefaultFuncStat(),
    Code: countUpLambdaFunction,
    FunctionName: 'job0-function0'
  }
];

const stats: IJobStat[] = [
  {
    environment: 'pending',
    fromJobIDs: [],
    funcs: funcStats,
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
    funcs: funcStats,
    id: 1,
    isStartJob: false,
    isTerminusJob: true,
    name: 'job1',
    state: JobState.Suspend,
    toJobIDs: []
  }
];

describe('StatManager', () => {
  it('handle job stats', async () => {
    const statManager = new StatManager();

    const dummyEvent = { foo: 'bar' };
    statManager.updateJobEvent(stats[0].id, dummyEvent);
    expect(statManager.getJobEventAndResults(0)).toEqual({ event: dummyEvent });
    const dummyResults = { foo2: 'bar2' };
    statManager.updateJobResults(stats[0].id, dummyResults);
    expect(statManager.getJobEventAndResults(0)).toEqual({ event: dummyEvent, results: dummyResults });
  });

  it('handle func stats', async () => {
    const statManager = new StatManager();

    const funcName = 'func1';
    const dummyEvent = { foo: 'bar' };
    statManager.updateFuncEvent(funcName, dummyEvent);
    const dummyResults = { foo2: 'bar2' };
    statManager.updateFuncResults(funcName, dummyResults);
    const funcStat = { FunctionName: funcName } as JobFuncStat;
    expect(statManager.newFuncStat(funcStat)).toEqual({ ...funcStat, event: dummyEvent, results: dummyResults });
  });
});
