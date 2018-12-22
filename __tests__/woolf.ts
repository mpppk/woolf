import { Lamool } from 'lamool/src/lamool';
import { IWoolfEventHandlers } from '../src/eventHandlers';
import { Woolf } from '../src/woolf';

describe('woolf', () => {
  const lamool = new Lamool();
  const workflowName = 'woolf';
  const woolf = new Woolf(lamool, {name: workflowName});

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('handle addNewJob event', async () => {
    const jobName = 'test job';
    const eventHandlers: Partial<IWoolfEventHandlers> = {
      addNewJob: [(eventType, context) => {
        expect(eventType).toBe('addNewJob');
        expect(context.jobName).toBe(jobName);
        expect(context.workflowName).toBe(workflowName);
      }],
    };
    woolf.updateEventHandlers(eventHandlers);
    woolf.newJob({name: jobName});
  });
});
