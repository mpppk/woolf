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

  it('handle startJob and finishJob event', async () => {
    const jobName = 'test-job';
    let startJobEventIsCalled = false;
    let finishJobEventIsCalled = false;
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      finishJob: [(eventType, context) => {
        expect(eventType).toBe('finishJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
        startJobEventIsCalled = true;
      }],
      startJob: [(eventType, context) => {
        expect(eventType).toBe('startJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
        finishJobEventIsCalled = true;
      }],
    };
    woolf.updateEventHandlers(eventHandlers);
    const job = woolf.newJob({name: jobName});
    await job.addFunc<{count: number}>((event, _, cb) => {cb(null, {count: event.count+1})}); // FIXME
    await woolf.run({data: [{count: 0}]});
    expect(startJobEventIsCalled).toBeTruthy();
    expect(finishJobEventIsCalled).toBeTruthy();
  });
});
