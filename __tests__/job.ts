import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { Woolf } from '../src/woolf';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10',
};

describe('local lambda', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, defaultCreateFunctionRequest);

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute functions', async () => {
    const job = woolf.newJob();
    await job.addFunc<{data: number}>('add1', (event, _, cb) => {cb(null, {data: event.data+1})}); // FIXME
    await job.addFunc<{data: number}>('add1', (event, _, cb) => {cb(null, {data: event.data+1})}); // FIXME
    await job.addFunc<{data: number}>('add2', (event, _, cb) => {cb(null, {data: event.data+2})}); // FIXME
    const newData = await job.run({data: 1}) as {data: number};
    expect(newData.data).toBe(5);
  });

  it('throw exception if function is failed', async () => {
    const job = woolf.newJob();
    await job.addFunc('fail', (_e, _c, cb) => {cb(new Error('error'), null)}); // FIXME
    await expect(job.run({})).rejects.toThrow('failed to execute function: currentData: {}, funcName: fail,  error type:Error message:undefined'); // FIXME message undefined
  });
});
