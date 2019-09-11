import { Lamool } from 'lamool';
import { Woolf } from '../src';
import { JobState } from '../src/scheduler/scheduler';
import { countUpLambdaFunction } from './utils/utils';

describe('JobState', () => {
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

  it('must be DONE if job has correctly finished functions', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction);
    await woolf.run({ count: 0 });
    const stat = woolf.stats()[0];
    expect(stat.state).toEqual(JobState.Done);
  });

  it('must be FAILED if job execution is failed', async () => {
    const job = woolf.newJob();
    await job.addFunc(() => {
      throw new Error();
    });
    await expect(woolf.run({ count: 0 })).rejects.toBeTruthy();
    const stat = woolf.stats()[0];
    expect(stat.state).toEqual(JobState.Failed);
  });
});
