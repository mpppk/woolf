import { Lamool } from 'lamool/src/lamool';
import { IWoolfEventHandlers } from '../src/eventHandlers';
import { JobState } from '../src/scheduler/scheduler';
import { Woolf } from '../src/woolf';
import { countUpLambdaFunction } from './utils/utils';

interface ICountPayload {
  count: number;
}

describe('woolf', () => {
  let lamool: Lamool;
  const workflowName = 'woolf';
  let woolf: Woolf;

  beforeEach(() => {
    lamool = new Lamool();
    woolf = new Woolf(lamool, { name: workflowName });
  });

  afterEach(async () => {
    await lamool.terminate(true);
  });

  it('handle addNewJob event', async () => {
    let addNewJobEventIsCalled = false;
    const jobName = 'test-job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [
        (eventType, context) => {
          expect(eventType).toBe('addNewJob');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          addNewJobEventIsCalled = true;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({ name: jobName });
    expect(addNewJobEventIsCalled).toBeTruthy();
  });

  it('handle multiple handlers for addNewJob', async () => {
    let addNewJobCBIsCalled = false;
    let anotherAddNewJobCBIsCalled = false;
    const jobName = 'test-job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [
        (eventType, context) => {
          expect(eventType).toBe('addNewJob');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          addNewJobCBIsCalled = true;
        },
        (eventType, context) => {
          expect(eventType).toBe('addNewJob');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          anotherAddNewJobCBIsCalled = true;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({ name: jobName });
    expect(addNewJobCBIsCalled).toBe(true);
    expect(anotherAddNewJobCBIsCalled).toBe(true);
  });

  it('handle addNewJob events corresponding to multiple jobs', async () => {
    let addNewJobCVCalledCount = 0;
    const jobName = 'test-job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [
        (eventType, context) => {
          expect(eventType).toBe('addNewJob');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          addNewJobCVCalledCount++;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({ name: jobName });
    woolf.newJob({ name: jobName });
    expect(addNewJobCVCalledCount).toBe(2);
  });

  it('handle start and finish events', async () => {
    const jobName = 'test-job';
    const initialPayload = { count: 0 };
    const expectedResult = { count: 1 };
    let startJobEventCBIsCalled = false;
    let finishJobEventCBIsCalled = false;
    let startEventCBIsCalled = false;
    let finishEventCBIsCalled = false;

    const eventHandlers: Partial<IWoolfEventHandlers> = {
      finish: [
        (eventType, context) => {
          expect(eventType).toBe('finish');
          expect(context.workflowName).toBe(workflowName);
          expect(context.payload).toEqual(initialPayload);
          expect(context.result).toEqual([expectedResult]);
          finishEventCBIsCalled = true;
        }
      ],
      finishJob: [
        (eventType, context) => {
          expect(eventType).toBe('finishJob');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          expect(context.payload).toEqual(initialPayload);
          expect(context.result).toEqual(expectedResult);
          expect(context.nextJobs).toHaveLength(0);
          const statsSummary = context.stats.map(s => ({ id: s.id, state: s.state }));
          expect(statsSummary).toEqual(expect.arrayContaining([{ id: 0, state: JobState.Done }]));
          startJobEventCBIsCalled = true;
        }
      ],
      start: [
        (eventType, context) => {
          expect(eventType).toBe('start');
          expect(context.workflowName).toBe(workflowName);
          expect(context.payload).toEqual(initialPayload);
          expect(context.result).toEqual({});
          startEventCBIsCalled = true;
        }
      ],
      startJob: [
        (eventType, context) => {
          expect(eventType).toBe('startJob');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          expect(context.payload).toEqual(initialPayload);
          expect(context.result).toEqual({});
          finishJobEventCBIsCalled = true;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    const job = woolf.newJob({ name: jobName });
    await job.addFunc<ICountPayload>(countUpLambdaFunction); // FIXME
    await woolf.run(initialPayload);
    expect(startEventCBIsCalled).toBeTruthy();
    expect(finishEventCBIsCalled).toBeTruthy();
    expect(startJobEventCBIsCalled).toBeTruthy();
    expect(finishJobEventCBIsCalled).toBeTruthy();
  });

  it('handle add func event', async () => {
    let addFuncEventIsCalled = false;
    const jobName = 'test-job';
    const funcName = 'test-func';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addFunc: [
        (eventType, context) => {
          expect(eventType).toBe('addFunc');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          expect(context.funcName).toBe(`${jobName}-${funcName}`);
          addFuncEventIsCalled = true;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    const job = woolf.newJob({ name: jobName });
    await job.addFunc(() => {}, { FunctionName: funcName }); // tslint:disable-line
    expect(addFuncEventIsCalled).toBeTruthy();
  });

  it('handle start/finish func events', async () => {
    let startFuncEventIsCalled = false;
    let finishFuncEventIsCalled = false;
    const jobName = 'test-job';
    const funcName = 'test-func';
    const initialPayload = { count: 0 };
    const expectedResults = { count: 1 };
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      finishFunc: [
        (eventType, context) => {
          expect(eventType).toBe('finishFunc');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          expect(context.funcName).toBe(`${jobName}-${funcName}`);
          expect(context.payload).toEqual(initialPayload);
          expect(context.result).toEqual(expectedResults);
          expect(context.environment).toEqual('local');
          finishFuncEventIsCalled = true;
        }
      ],
      startFunc: [
        (eventType, context) => {
          expect(eventType).toBe('startFunc');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          expect(context.funcName).toBe(`${jobName}-${funcName}`);
          expect(context.payload).toEqual(initialPayload);
          expect(context.result).toEqual({});
          expect(context.environment).toEqual('local');
          startFuncEventIsCalled = true;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    const job = woolf.newJob({ name: jobName });
    await job.addFunc<ICountPayload>(
      e => {
        return { count: e.count + 1 };
      },
      { FunctionName: funcName }
    ); // tslint:disable-line
    await woolf.run(initialPayload);
    expect(finishFuncEventIsCalled).toBeTruthy();
    expect(startFuncEventIsCalled).toBeTruthy();
  });

  it('handle failed func events', async () => {
    let failFuncEventIsCalled = false;
    const jobName = 'test-job';
    const funcName = 'test-func';
    const initialPayload = { count: 0 };
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      failFunc: [
        (eventType, context) => {
          expect(eventType).toBe('failFunc');
          expect(context.jobName).toBe(jobName);
          expect(context.workflowName).toBe(workflowName);
          expect(context.funcName).toBe(`${jobName}-${funcName}`);
          expect(context.payload).toEqual(initialPayload);
          expect(context.environment).toEqual('local');
          failFuncEventIsCalled = true;
        }
      ]
    };
    woolf.updateEventHandlers(eventHandlers);
    const job = woolf.newJob({ name: jobName });
    await job.addFunc<ICountPayload>(
      () => {
        throw new Error();
      },
      { FunctionName: funcName }
    ); // tslint:disable-line

    await expect(woolf.run(initialPayload)).rejects.toBeTruthy();
    expect(failFuncEventIsCalled).toBeTruthy();
  });
});
