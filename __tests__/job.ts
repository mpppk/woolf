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
  await job.addFunc('add1', (event, _, cb) => {cb(null, {data: (event as any).data+1})}); // FIXME
  await job.addFunc('add1', (event, _, cb) => {cb(null, {data: (event as any).data+1})}); // FIXME
  await job.addFunc('add2', (event, _, cb) => {cb(null, {data: (event as any).data+2})}); // FIXME
  const newData = await job.run({data: 1}) as {data: number};
  expect(newData.data).toBe(5);
});
