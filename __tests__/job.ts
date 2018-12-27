import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool';
import { Woolf } from '../src/woolf';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10',
};

describe('woolf job', () => {
  const lamool = new Lamool();
  const woolf = new Woolf(lamool, {name: 'woolf', defaultCreateFunctionRequest});

  afterAll(async () => {
    await lamool.terminate(true);
  });

  it('execute functions', async () => {
    const job = woolf.newJob({name: 'testJob'});
    await job.addFunc<{count: number}>((event, _, cb) => {cb(null, {count: event.data[0].count+1})}); // FIXME
    await job.addFunc<{count: number}>((event, _, cb) => {cb(null, {count: event.data[0].count+1})}); // FIXME
    await job.addFunc<{count: number}>((event, _, cb) => {cb(null, {count: event.data[0].count+2})}); // FIXME
    const newData = await job.run(Woolf.dataListToWoolfPayload([{count: 1}])) as {count: number};
    expect(newData.count).toBe(5);
  });

  it('throw exception if function is failed', async () => {
    const job = woolf.newJob({name: 'failJob'});
    await job.addFunc((_e, _c, cb) => {cb(new Error('error'), null)}); // FIXME
    await expect(job.run({data: []})).rejects.toThrow('failed to execute function: currentData: {"data":[]}, funcName: failJob-function0,  registered functions: failJob-function0, Handled error type:Error message:error'); // FIXME message undefined
  });
});
