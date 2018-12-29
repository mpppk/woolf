import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import * as _ from 'lodash';
import { IJobOption, Job } from '../job';
import { ILambda } from '../lambda/ILambda';
import { IWoolfResult } from '../models';
import { DAG } from './dag';

export enum JobState {
  Done = 'DONE',
  Ready = 'READY',
  Suspend = 'SUSPEND',
}

export interface IJobStat {
  job: Job,
  state: JobState,
  waitingJobIDs: number[],
}

export class Scheduler {
  private graph = new DAG<Job>();
  private doneJobs: Map<number, IWoolfResult> = new Map();

  public addJob(job: Job) {
    this.graph.addNode(job);
  }

  public newJob(lambda: ILambda, defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {},
                jobOpt: Partial<IJobOption> = {}) {
    const job = new Job(this.graph.getNewID(), lambda, defaultCreateFunctionRequest, jobOpt);
    this.addJob(job);
    return job;
  }

  public addDependency(from: Job, to: Job) {
    this.graph.addEdge(from, to);
  }

  public doneJob(job: Job, result: IWoolfResult): Array<[Job, IWoolfResult[]]> {
    this.doneJobs.set(job.id, result);
    const nextJobs = this.graph.getToNodes(job)
      .filter((djob) => !this.doneJobs.has(djob.id))
      .filter(this.isReadiedJob.bind(this));
    const dataList: IWoolfResult[][] = nextJobs.map(this.getDataListForJob.bind(this));
    return _.zip(nextJobs, dataList) as Array<[Job, IWoolfResult[]]>;
  }

  public isReadiedJob(job: Job): boolean {
    if (this.isDoneJob(job)) {
      return false;
    }
    const fromJobs = this.graph.getFromNodes(job);
    return fromJobs.every((dependencyJob) => this.doneJobs.has(dependencyJob.id));
  }

  public getReadiedJobs(): Array<[Job, IWoolfResult[]]> {
      const readiedJobs = this.graph.getNodes().filter(this.isReadiedJob.bind(this));
      const dataList = readiedJobs.map(this.getDataListForJob.bind(this));
      return _.zip(readiedJobs, dataList) as Array<[Job, IWoolfResult[]]>;
  }

  public isSuspendedJob(job: Job): boolean {
    return !this.isDoneJob(job) && !this.isReadiedJob(job);
  }

  public getSuspendedJobs(): Job[] {
    const jobIDs = this.graph.getNodes().map(job => job.id);
    const doneJobIDs = Array.from(this.doneJobs.keys());
    const readiedJobIDs = this.getReadiedJobs().map(d => d[0].id);
    const suspendedJobIDs = _.difference(_.difference(jobIDs, doneJobIDs), readiedJobIDs);
    return suspendedJobIDs
      .map((id) => this.graph.getNode(id))
      .filter(job => job) as Job[];
  }

  public isDoneJob(job: Job): boolean {
    return Array.from(this.doneJobs.keys()).find(id => id === job.id) !== undefined;
  }

  public getDoneJobs(): Job[] {
    return Array.from(this.doneJobs.keys())
      .map((id) => this.graph.getNode(id))
      .filter(job => job) as Job[];
  }

  public isLastJob(job: Job): boolean {
    return this.graph.getToNodes(job).length === 0;
  }

  public getJobState(job: Job): JobState {
    if (this.isDoneJob(job)) {
      return JobState.Done;
    }
    if (this.isReadiedJob(job)) {
      return JobState.Ready;
    }
    if (this.isSuspendedJob(job)) {
      return JobState.Suspend;
    }
    throw new Error('unknown state job: ' + job);
  }

  public stats(): IJobStat[] {
    return this.graph.getNodes().map((job) => ({
      job,
      state: this.getJobState(job),
      waitingJobIDs: this.graph.getFromNodes(job).map((j) => j.id),
    }));
  }

  private getDataListForJob(job: Job): IWoolfResult[] {
    return this.graph.getFromNodes(job)
      .map((fromJob) => this.doneJobs.get(fromJob.id))
      .map((dl) => dl ? dl : []);
  }
}
