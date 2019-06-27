import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { Job, JobFuncStat, JobFuncState } from '../src/job';
import { Woolf } from '../src/woolf';
import { countUpLambdaFunction, generateDefaultFuncStat } from './utils/utils';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10'
};

interface ICountPayload {
  count: number;
}

describe('woolf job', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, { name: 'woolf', defaultCreateFunctionRequest });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute functions', async () => {
    const job = woolf.newJob({ name: 'testJob' });
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    const newData = await job.run({ count: 1 });
    expect(newData.count).toBe(4);
  });

  it('throw exception if function is failed', async () => {
    const job = woolf.newJob({ name: 'failJob' });
    await job.addFunc((_e, _c, cb) => {
      cb(new Error('error'), null);
    }); // FIXME
    await expect(job.run({ data: [] })).rejects.toThrow(
      'failed to execute function: currentData: {"data":[]}, funcName: failJob-function0,  registered functions: failJob-function0, Handled error type:Error message:error'
    ); // FIXME message undefined
  });

  it('update environment', async () => {
    const job = woolf.newJob();
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    expect(job.environment).toBe('pending');
    await job.run({ count: 1 });
    expect(job.environment).toBe('local');
  });
});

describe('paths', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, { name: 'woolf', defaultCreateFunctionRequest });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('handle InputPath', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      InputPath: '$.nest'
    });
    const result = await job.run({ nest: { count: 0 } });
    expect(result).toEqual({ count: 1 });
  });

  it('handle ResultPath', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      ResultPath: '$.result'
    });
    const result = await job.run({ count: 0 });
    expect(result).toEqual({ count: 0, result: { count: 1 } });
  });

  it('handle OutputPath', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      OutputPath: '$.count'
    });
    const result = await job.run({ count: 0 });
    expect(result).toEqual(1);
  });
});

describe('Parameters', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, { name: 'woolf', defaultCreateFunctionRequest });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('add properties to payload', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      Parameters: { count: 1 }
    });
    const result = await job.run({});
    expect(result).toEqual({ count: 2 });
  });

  it('overwrite original payload', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      Parameters: { count: 1 }
    });
    const result = await job.run({ count: 0 });
    expect(result).toEqual({ count: 2 });
  });
});

describe('stats', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, { name: 'woolf', defaultCreateFunctionRequest });
  const woolf2 = new Woolf(lamool, { name: 'woolf', defaultCreateFunctionRequest });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('provide func name', async () => {
    const expectedJobName = 'test-job';
    const job = woolf2.newJob({
      name: expectedJobName
    });
    const expectedFunctionName = 'test-name';
    await job.addFunc(countUpLambdaFunction, {
      FunctionName: expectedFunctionName,
      Parameters: { count: 1 }
    });

    const expectedStat: JobFuncStat = {
      ...generateDefaultFuncStat(),
      Code: countUpLambdaFunction,
      FunctionName: `${expectedJobName}-${expectedFunctionName}`,
      Parameters: { count: 1 }
    };
    const stat = job.getFuncStats()[0];
    expect(stat).toEqual(expectedStat);
  });

  it('update func state', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      Parameters: { count: 1 }
    });

    const expectedStat1: JobFuncStat = {
      ...generateDefaultFuncStat(),
      Code: countUpLambdaFunction,
      Parameters: { count: 1 }
    };
    const stat = job.getFuncStats()[0];
    expect(stat).toEqual(expectedStat1);

    await job.run({});
    const expectedStat2: JobFuncStat = {
      ...generateDefaultFuncStat(),
      Code: countUpLambdaFunction,
      Parameters: { count: 1 },
      state: JobFuncState.Done
    };
    const stat2 = job.getFuncStats()[0];
    expect(stat2).toEqual(expectedStat2);
  });
});

describe('EventManager', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, { name: 'woolf', defaultCreateFunctionRequest });

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('handle funcStats if startFunc event is triggered', async () => {
    const job = new Job(1, lamool);
    await job.addFunc(countUpLambdaFunction, {
      Parameters: { count: 1 }
    });
    woolf.updateEventHandlers({
      finishFunc: [
        (_type, context) => {
          const stats = context.funcStats;
          expect(stats).toHaveLength(1);
          expect(stats[0].state).toEqual(JobFuncState.Done);
        }
      ],
      startFunc: [
        (_type, context) => {
          const stats = context.funcStats;
          expect(stats).toHaveLength(1);
          expect(stats[0].state).toEqual(JobFuncState.Processing);
        }
      ]
    });
    const result = await job.run({});
    expect(result).toEqual({ count: 2 });
  });
});

describe('Job.getFuncStats', () => {
  const lamool = new Lamool();

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('return object that have InputPath/Output/Parameters property', async () => {
    const job = new Job(1, lamool);
    const countParameters = { count: 1 };
    await job.addFunc(countUpLambdaFunction, {
      Parameters: countParameters
    });
    const jobStats = job.getFuncStats();
    expect(jobStats).toHaveLength(1);
    const jobStat = jobStats[0];
    expect(jobStat.InputPath).toBe('$');
    expect(jobStat.OutputPath).toBe('$');
    expect(jobStat.Parameters).toEqual(countParameters);
  });
});
