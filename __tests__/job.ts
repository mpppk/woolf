import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { IWoolfPayload } from '../src/models';
import { Woolf } from '../src/woolf';
import { LambdaFunction } from 'lamool/src/lambda';

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
    await job.addFunc<IWoolfPayload<ICountPayload>, ICountPayload>((event, _, cb) => {cb(null, {count: event.data[0].count+1})}); // FIXME
    await job.addFunc<IWoolfPayload<ICountPayload>, ICountPayload>((event, _, cb) => {cb(null, {count: event.data[0].count+1})}); // FIXME
    await job.addFunc<IWoolfPayload<ICountPayload>, ICountPayload>((event, _, cb) => {cb(null, {count: event.data[0].count+2})}); // FIXME
    const newData = await job.run(Woolf.dataListToWoolfPayload([{count: 1}])) as {count: number};
    expect(newData.count).toBe(5);
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
    const countUpFunc: LambdaFunction<IWoolfPayload<ICountPayload>, ICountPayload> = (event, _, cb) => {cb(null, {count: event.data[0].count+1})};
    await job.addFunc(countUpFunc, {
      InputPath: '$.nest'
    });
    const result = await job.run({nest:{data: [{count: 0}]}});
    expect(result).toEqual({count: 1});
  });
});
