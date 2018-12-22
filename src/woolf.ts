import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import * as _ from 'lodash';
import { map } from 'p-iteration';
import { IWoolfEventHandlers } from './eventHandlers';
import { EventManager } from './eventManager';
import { IJobOption, Job } from './job';
import { ILambda } from './lambda/ILambda';
import { IWoolfPayload, IWoolfResult } from './models';
import { Scheduler } from './scheduler/scheduler';

export interface IWoolfOption {
  name: string;
  defaultCreateFunctionRequest: Partial<CreateFunctionRequest>;
  eventHandlers: IWoolfEventHandlers;
}
const defaultWoolfOption = {
  defaultCreateFunctionRequest: {},
  name: 'no name',
};

export class Woolf {
  private static dataListToWoolfPayload(dataList: IWoolfResult[]): IWoolfPayload {
    return {data: dataList};
  }

  private eventManager: EventManager;
  private scheduler = new Scheduler();
  private readonly name: string;
  constructor(private lambda: ILambda, private opt: Partial<IWoolfOption> = defaultWoolfOption) {
    this.eventManager = new EventManager(opt.eventHandlers);
    this.name = this.opt.name || 'no name';
  }

  public updateEventHandlers(eventHandlers: Partial<IWoolfEventHandlers>) {
    this.eventManager.updateEventHandlers(eventHandlers);
  }

  public newJob(jobOpt: Partial<IJobOption> = {}): Job {
    const job = this.scheduler.newJob(this.lambda, this.opt.defaultCreateFunctionRequest, jobOpt);
    this.eventManager.triggerAddNewJob(this.name, job.name);
    return job;
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
