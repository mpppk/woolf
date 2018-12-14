import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Lamool } from 'lamool/src/lamool';
import { Woolf } from '../src/woolf';

const defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10',
};

const woolf = new Woolf(new Lamool(), defaultCreateFunctionRequest);
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
  await job.addFunc('add1', (_e, _c, cb) => {cb(new Error('error'), null)}); // FIXME
  await expect(job.run({})).rejects.toThrow('failed to execute function: currentData: {}, funcName: add1,  error type:Error message:undefined'); // FIXME message undefined
});
