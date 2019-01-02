import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { Woolf } from '../src/woolf';
import { countUpLambdaFunction } from './utils/utils';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10',
};

interface ICountPayload {
  count: number;
}

describe('woolf job', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, {name: 'woolf', defaultCreateFunctionRequest});

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute functions', async () => {
    const job = woolf.newJob({name: 'testJob'});
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    await job.addFunc<ICountPayload>(countUpLambdaFunction);
    const newData = await job.run({count: 1});
    expect(newData.count).toBe(4);
  });

  it('throw exception if function is failed', async () => {
    const job = woolf.newJob({name: 'failJob'});
    await job.addFunc((_e, _c, cb) => {cb(new Error('error'), null)}); // FIXME
    await expect(job.run({data: []})).rejects.toThrow('failed to execute function: currentData: {"data":[]}, funcName: failJob-function0,  registered functions: failJob-function0, Handled error type:Error message:error'); // FIXME message undefined
  });
});

describe('paths', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, {name: 'woolf', defaultCreateFunctionRequest});

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('handle InputPath', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      InputPath: '$.nest'
    });
    const result = await job.run({nest:{count: 0}});
    expect(result).toEqual({count: 1});
  });


  it('handle ResultPath', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      ResultPath: '$.result'
    });
    const result = await job.run({count: 0});
    expect(result).toEqual({count: 0, result: {count: 1}});
  });

  it('handle OutputPath', async () => {
    const job = woolf.newJob();
    await job.addFunc(countUpLambdaFunction, {
      OutputPath: '$.count'
    });
    const result = await job.run({count: 0});
    expect(result).toEqual(1);
  });
});
