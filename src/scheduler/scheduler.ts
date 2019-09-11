import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { LambdaEnvironment } from 'lamool';
import * as _ from 'lodash';
import { IJobInOut, IJobOption, Job, JobFuncStat } from '../job';
import { ILambda } from '../lambda/ILambda';
import { IWoolfData } from '../models';
import { DAG } from './dag';

export enum JobState {
  Processing = 'PROCESSING',
  Done = 'DONE',
  Ready = 'READY',
  Suspend = 'SUSPEND',
  Failed = 'FAILED'
}

export type JobEnvironment = LambdaEnvironment | 'pending';

export interface IJobStat extends Partial<IJobInOut> {
  environment: JobEnvironment;
  funcs: JobFuncStat[];
  id: number;
  isStartJob: boolean;
  isTerminusJob: boolean;
  name: string;
  state: JobState;
  toJobIDs: number[];
  fromJobIDs: number[];
}

export class Scheduler {
  private graph = new DAG<Job>();
  private doneJobs: Map<number, IWoolfData> = new Map();
  private processingJobIDs: number[] = [];
  private failedJobIDs: number[] = [];

  public addJob(job: Job) {
    this.graph.addNode(job);
  }

  public newJob(
    lambda: ILambda,
    defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {},
    jobOpt: Partial<IJobOption> = {}
  ) {
    const job = new Job(this.graph.getNewID(), lambda, defaultCreateFunctionRequest, jobOpt);
    this.addJob(job);
    return job;
  }

  public addDependency(from: Job, to: Job) {
    this.graph.addEdge(from, to);
  }

  public startJob(job: Job) {
    this.processingJobIDs.push(job.id);
  }

  public doneJob(job: Job, result: IWoolfData): Array<[Job, IWoolfData[]]> {
    if (job.environment === 'pending') {
      throw new Error('invalid job environment: ' + job.environment);
    }

    this.processingJobIDs = this.processingJobIDs.filter(id => id !== job.id);
    this.doneJobs.set(job.id, result);
    const nextJobs = this.graph
      .getToNodes(job)
      .filter(djob => !this.doneJobs.has(djob.id))
      .filter(this.isReadiedJob.bind(this));
    const dataList: IWoolfData[][] = nextJobs.map(this.getDataListForJob.bind(this));
    return _.zip(nextJobs, dataList) as Array<[Job, IWoolfData[]]>;
  }

  public failJob(job: Job) {
    this.processingJobIDs = this.processingJobIDs.filter(id => id !== job.id);
    this.failedJobIDs.push(job.id);
  }

  public isReadiedJob(job: Job): boolean {
    if (this.isDoneJob(job)) {
      return false;
    }
    const fromJobs = this.graph.getFromNodes(job);
    return fromJobs.every(dependencyJob => this.doneJobs.has(dependencyJob.id));
  }

  public getReadiedJobs(): Array<[Job, IWoolfData[]]> {
    const readiedJobs = this.graph.getNodes().filter(this.isReadiedJob.bind(this));
    const dataList = readiedJobs.map(this.getDataListForJob.bind(this));
    return _.zip(readiedJobs, dataList) as Array<[Job, IWoolfData[]]>;
  }

  public isSuspendedJob(job: Job): boolean {
    // FIXME
    return !this.isDoneJob(job) && !this.isReadiedJob(job) && !this.isFailedJob(job);
  }

  public isFailedJob(job: Job): boolean {
    return this.failedJobIDs.includes(job.id);
  }

  public getSuspendedJobs(): Job[] {
    const jobIDs = this.graph.getNodes().map(job => job.id);
    const doneJobIDs = Array.from(this.doneJobs.keys());
    const readiedJobIDs = this.getReadiedJobs().map(d => d[0].id);
    const suspendedJobIDs = _.difference(_.difference(jobIDs, doneJobIDs), readiedJobIDs);
    return suspendedJobIDs.map(id => this.graph.getNode(id)).filter(job => job) as Job[];
  }

  public isDoneJob(job: Job): boolean {
    return Array.from(this.doneJobs.keys()).find(id => id === job.id) !== undefined;
  }

  public getDoneJobs(): Job[] {
    return Array.from(this.doneJobs.keys())
      .map(id => this.graph.getNode(id))
      .filter(job => job) as Job[];
  }

  public isLastJob(job: Job): boolean {
    return this.graph.getToNodes(job).length === 0;
  }

  public getJobState(job: Job): JobState {
    if (this.processingJobIDs.find(id => id === job.id) !== undefined) {
      return JobState.Processing;
    }

    if (this.isFailedJob(job)) {
      return JobState.Failed;
    }
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
    return this.graph.getNodes().map(this.getJobStat.bind(this));
  }

  private getStartJobs(): Job[] {
    return this.graph.getStartNodes();
  }

  private getTerminusJobs(): Job[] {
    return this.graph.getTerminusNodes();
  }

  private getJobStat(job: Job): IJobStat {
    const startJobIDs = this.getStartJobs().map(j => j.id);
    const terminusJobIDs = this.getTerminusJobs().map(j => j.id);
    const { payload, results } = job.getJobInOutData();

    return {
      environment: job.environment,
      fromJobIDs: this.graph.getFromNodes(job).map(j => j.id),
      funcs: job.getFuncStats(),
      id: job.id,
      isStartJob: startJobIDs.includes(job.id),
      isTerminusJob: terminusJobIDs.includes(job.id),
      name: job.name,
      payload,
      results,
      state: this.getJobState(job),
      toJobIDs: this.graph.getToNodes(job).map(j => j.id)
    };
  }

  private getDataListForJob(job: Job): IWoolfData[] {
    return this.graph
      .getFromNodes(job)
      .map(fromJob => this.doneJobs.get(fromJob.id))
      .map(dl => (dl ? dl : []));
  }
}
