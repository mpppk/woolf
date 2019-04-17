import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import * as _ from 'lodash';
import { map } from 'p-iteration';
import { IWoolfEventHandlers } from './eventHandlers';
import { EventManager } from './eventManager';
import { IJobOption, Job } from './job';
import { ILambda } from './lambda/ILambda';
import { IWoolfData } from './models';
import { IJobStat, Scheduler } from './scheduler/scheduler';

export interface IWoolfOption {
  name: string;
  defaultCreateFunctionRequest: Partial<CreateFunctionRequest>;
  eventHandlers: IWoolfEventHandlers;
}

const defaultCreateFunctionRequest: Pick<CreateFunctionRequest, 'Handler' | 'Role' | 'Runtime'> = {
  Handler: 'index.handler',
  Role: '-',
  Runtime: 'nodejs8.10'
};

export class Woolf {
  private readonly eventManager: EventManager;
  private scheduler = new Scheduler();
  private readonly name: string;
  private readonly defaultCreateFunctionRequest: Partial<CreateFunctionRequest>;
  constructor(private lambda: ILambda, opt: Partial<IWoolfOption> = {}) {
    this.eventManager = new EventManager(opt.eventHandlers);
    this.name = opt.name || 'no name';
    this.defaultCreateFunctionRequest = {
      ...defaultCreateFunctionRequest,
      ...opt.defaultCreateFunctionRequest
    };
  }

  public updateEventHandlers(eventHandlers: Partial<IWoolfEventHandlers>) {
    this.eventManager.updateEventHandlers(eventHandlers);
  }

  public newJob(jobOpt: Partial<IJobOption> = {}): Job {
    const newJobOpt = {
      eventManager: this.eventManager,
      workflowName: this.name,
      ...jobOpt
    };
    const job = this.scheduler.newJob(this.lambda, this.defaultCreateFunctionRequest, newJobOpt);
    this.eventManager.dispatchAddNewJobEvent(EventManager.getBaseJobContext(this.name, job.name));
    return job;
  }

  public addDependency(from: Job, to: Job) {
    this.scheduler.addDependency(from, to);
  }

  public async run<T extends IWoolfData = IWoolfData, U = T>(initialPayload: T): Promise<U[]> {
    const wfContext = EventManager.getWFContext(this.name, initialPayload);
    this.eventManager.dispatchStartEvent(wfContext);
    const initialJobs = this.scheduler.getReadiedJobs().map(jd => jd[0]);

    const runJob = async (job: Job, payload: IWoolfData): Promise<IWoolfData[]> => {
      this.scheduler.startJob(job);
      const jobContext = EventManager.getJobContext(this.name, job.name, payload);
      this.eventManager.dispatchStartJobEvent(jobContext);
      const result = await job.run(payload);
      const nextJobAndDataList = this.scheduler.doneJob(job, result);
      this.eventManager.dispatchFinishJobEvent({
        ...jobContext,
        nextJobs: nextJobAndDataList.map(t => t[0]),
        result,
        stats: this.stats()
      });
      if (this.scheduler.isLastJob(job)) {
        return [result];
      }

      if (nextJobAndDataList.length === 0) {
        return [];
      }

      const results: IWoolfData[][] = await map(nextJobAndDataList, async n => {
        const [j, dataList] = n;
        return await runJob(j, dataList);
      });

      return _.flatten(results);
    };
    const r = _.flatten(await map(initialJobs, async job => await runJob(job, initialPayload)));
    this.eventManager.dispatchFinishEvent({ ...wfContext, result: r });
    return r as U[];
  }

  public stats(): IJobStat[] {
    return this.scheduler.stats();
  }
}
