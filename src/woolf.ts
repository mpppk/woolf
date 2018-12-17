import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import * as _ from 'lodash';
import { map } from 'p-iteration';
import { Job } from './job';
import { ILambda } from './lambda/ILambda';
import { IWoolfPayload, IWoolfResult } from './models';
import { Scheduler } from './scheduler/scheduler';

export class Woolf {
  private static dataListToWoolfPayload(dataList: IWoolfResult[]): IWoolfPayload {
    return {data: dataList};
  }

  private scheduler = new Scheduler();
  constructor(private lambda: ILambda, private defaultCreateFunctionRequest: Partial<CreateFunctionRequest>) {}

  public newJob(): Job {
    return this.scheduler.newJob(this.lambda, this.defaultCreateFunctionRequest);
  }

  public addDependency(from: Job, to: Job) {
    this.scheduler.addDependency(from, to);
  }

  public async run(initialPayload: IWoolfPayload): Promise<IWoolfResult[]> {
    const initialJobs = this.scheduler.getReadiedJobs().map((jd) => jd[0]);
    const runJob = async (job: Job, data: IWoolfPayload): Promise<IWoolfResult[]> => {
      const result = await job.run(data);
      const nextJobAndDataList = this.scheduler.doneJob(job, result);
      if (this.scheduler.isLastJob(job)) {
        return [result];
      }

      if (nextJobAndDataList.length === 0) {
        return [];
      }

      const results: IWoolfResult[][] = await map(nextJobAndDataList, async (n) => {
        const [j, dataList] = n;
        return await runJob(j, Woolf.dataListToWoolfPayload(dataList));
      });

      return _.flatten(results);
    };
    return _.flatten(await map(initialJobs, async (job) => await runJob(job, initialPayload)));
  }
}
