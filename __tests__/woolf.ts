import { Lamool } from 'lamool/src/lamool';
import { IWoolfEventHandlers } from '../src/eventHandlers';
import { Woolf } from '../src/woolf';

describe('woolf', () => {
  let lamool: Lamool;
  const workflowName = 'woolf';
  let woolf: Woolf;

  beforeEach(() => {
    lamool = new Lamool();
    woolf = new Woolf(lamool, {name: workflowName});
  });

  afterEach(async () => {
    await lamool.terminate(true);
  });

  it('handle addNewJob event', async () => {
    let addNewJobEventIsCalled = false;
    const jobName = 'test-job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [(eventType, context) => {
        expect(eventType).toBe('addNewJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
        addNewJobEventIsCalled = true;
      }],
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({name: jobName});
    expect(addNewJobEventIsCalled).toBeTruthy();
  });

  it('handle multiple handlers for addNewJob', async () => {
    let addNewJobCBIsCalled = false;
    let anotherAddNewJobCBIsCalled = false;
    const jobName = 'test-job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [(eventType, context) => {
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
      }],
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({name: jobName});
    expect(addNewJobCBIsCalled).toBe(true);
    expect(anotherAddNewJobCBIsCalled).toBe(true);
  });

  it('handle addNewJob events corresponding to multiple jobs', async () => {
    let addNewJobCVCalledCount = 0;
    const jobName = 'test-job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [(eventType, context) => {
        expect(eventType).toBe('addNewJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
        addNewJobCVCalledCount++;
      }],
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({name: jobName});
    woolf.newJob({name: jobName});
    expect(addNewJobCVCalledCount).toBe(2);
  });

  it('handle start and finish events', async () => {
    const jobName = 'test-job';
    let startJobEventCBIsCalled = false;
    let finishJobEventCBIsCalled = false;
    let startEventCBIsCalled = false;
    let finishEventCBIsCalled = false;
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      finish: [(eventType, context) => {
        expect(eventType).toBe('finish');
        expect(context.workflowName).toBe(workflowName);
        finishEventCBIsCalled = true;
      }],
      finishJob: [(eventType, context) => {
        expect(eventType).toBe('finishJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
        startJobEventCBIsCalled = true;
      }],
      start: [(eventType, context) => {
        expect(eventType).toBe('start');
        expect(context.workflowName).toBe(workflowName);
        startEventCBIsCalled = true;
      }],
      startJob: [(eventType, context) => {
        expect(eventType).toBe('startJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
        finishJobEventCBIsCalled = true;
      }],
    };
    woolf.updateEventHandlers(eventHandlers);
    const job = woolf.newJob({name: jobName});
    await job.addFunc<{count: number}>((event, _, cb) => {cb(null, {count: event.count+1})}); // FIXME
    await woolf.run({data: [{count: 0}]});
    expect(startEventCBIsCalled).toBeTruthy();
    expect(finishEventCBIsCalled).toBeTruthy();
    expect(startJobEventCBIsCalled).toBeTruthy();
    expect(finishJobEventCBIsCalled).toBeTruthy();
  });
});
