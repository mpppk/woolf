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

    const dummyPayload = { foo: 'bar' };
    statManager.updateJobPayload(stats[0].id, dummyPayload);
    expect(statManager.getJobEventAndResults(0)).toEqual({ payload: dummyPayload });
    const dummyResults = { foo2: 'bar2' };
    statManager.updateJobResults(stats[0].id, dummyResults);
    expect(statManager.getJobEventAndResults(0)).toEqual({ payload: dummyPayload, results: dummyResults });
  });

  it('handle func stats', async () => {
    const statManager = new StatManager();

    const funcName = 'func1';
    const dummyPayload = { foo: 'bar' };
    const dummyEvent = { foo: 'bar', foo2: 'bar2' };
    statManager.updateFuncPayload(funcName, dummyPayload);
    statManager.updateFuncEvent(funcName, dummyEvent);
    const dummyRawResults = { foo3: 'bar3' };
    const dummyResults = { foo4: 'bar4' };
    statManager.updateFuncRawResults(funcName, dummyRawResults);
    statManager.updateFuncResults(funcName, dummyResults);
    const funcStat = { FunctionName: funcName } as JobFuncStat;
    expect(statManager.newFuncStat(funcStat)).toEqual({
      ...funcStat,
      event: dummyEvent,
      payload: dummyPayload,
      rawResults: dummyRawResults,
      results: dummyResults
    });
  });
});
