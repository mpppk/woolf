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

const defaultCreateFunctionRequest: Pick<CreateFunctionRequest, 'Handler' | 'Role' | 'Runtime'> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10',
};

export class Woolf {
  private static dataListToWoolfPayload(dataList: IWoolfResult[]): IWoolfPayload {
    return {data: dataList};
  }

  private eventManager: EventManager;
  private scheduler = new Scheduler();
  private readonly name: string;
  private readonly defaultCreateFunctionRequest: Partial<CreateFunctionRequest>;
  constructor(private lambda: ILambda, opt: Partial<IWoolfOption> = {}) {
    this.eventManager = new EventManager(opt.eventHandlers);
    this.name = opt.name || 'no name';
    this.defaultCreateFunctionRequest = {
      ...defaultCreateFunctionRequest,
      ...opt.defaultCreateFunctionRequest,
    };
  }

  public updateEventHandlers(eventHandlers: Partial<IWoolfEventHandlers>) {
    this.eventManager.updateEventHandlers(eventHandlers);
  }

  public newJob(jobOpt: Partial<IJobOption> = {}): Job {
    const job = this.scheduler.newJob(this.lambda, this.defaultCreateFunctionRequest, jobOpt);
    this.eventManager.dispatchAddNewJobEvent(this.name, job.name);
    return job;
  }

  public addDependency(from: Job, to: Job) {
    this.scheduler.addDependency(from, to);
  }

  public async run(initialPayload: IWoolfPayload): Promise<IWoolfResult[]> {
    this.eventManager.dispatchStartEvent(this.name);
    const initialJobs = this.scheduler.getReadiedJobs().map((jd) => jd[0]);
    initialJobs.forEach((job) => this.eventManager.dispatchStartJobEvent(this.name, job.name));

    const runJob = async (job: Job, data: IWoolfPayload): Promise<IWoolfResult[]> => {
      const result = await job.run(data);
      this.eventManager.dispatchFinishJobEvent(this.name, job.name);
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
    const r = _.flatten(await map(initialJobs, async (job) => await runJob(job, initialPayload)));
    this.eventManager.dispatchFinishEvent(this.name);
    return r;
  }
}
