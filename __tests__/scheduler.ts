import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { LambdaFunction } from 'lamool/src/lambda';
import { IWoolfPayload } from '../src/models';
import { Woolf } from '../src/woolf';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10'
};

type SleepPayload = IWoolfPayload<{ sleepTime: number }>;

interface ISleepResult {
  sleepTime: number;
}

const generateAsyncSleepFunc: (time: number) => LambdaFunction<SleepPayload, ISleepResult> = (time: number) => {
  const funcStr = `
  setTimeout(() => {
    cb(null, {
      sleepTime: event.data.reduce((a, b) => a+b.sleepTime, 0) + ${time}
    })
  }, ${time});`;
  return Function('event', 'context', 'cb', funcStr) as LambdaFunction<SleepPayload, ISleepResult>;
};

describe('woolf workflow', () => {
  const lamool = new Lamool();
  let woolf: Woolf;

  beforeEach(() => {
    woolf = new Woolf(lamool, {defaultCreateFunctionRequest});
  });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute serial jobs', async () => {
    const job0 = woolf.newJob();
    await job0.addFunc<SleepPayload, ISleepResult>(generateAsyncSleepFunc(10)); // FIXME
    const job1 = woolf.newJob();
    await job1.addFunc<SleepPayload, ISleepResult>(generateAsyncSleepFunc(20)); // FIXME
    woolf.addDependency(job0, job1);
    const result = (await woolf.run({ data: [{ sleepTime: 0 }] })) as ISleepResult[];
    expect(result).toHaveLength(1);
    expect(result[0].sleepTime).toBe(30);
  });

  it('execute parallel jobs', async () => {
    const job0 = woolf.newJob();
    await job0.addFunc<SleepPayload, ISleepResult>(generateAsyncSleepFunc(10)); // FIXME
    const job1 = woolf.newJob();
    await job1.addFunc<SleepPayload, ISleepResult>(generateAsyncSleepFunc(20)); // FIXME
    const result = (await woolf.run({ data: [{ sleepTime: 0 }] })) as ISleepResult[];
    expect(result).toHaveLength(2);
    expect(result[0].sleepTime).toBe(10);
    expect(result[1].sleepTime).toBe(20);
  });
});
