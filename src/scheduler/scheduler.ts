import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import * as _ from 'lodash';
import { Job } from '../job';
import { ILambda } from '../lambda/ILambda';
import { IWoolfResult } from '../models';
import { DAG } from './dag';

export class Scheduler {
  private graph = new DAG<Job>();
  private doneJobs: Map<number, IWoolfResult> = new Map();

  public addJob(job: Job) {
    this.graph.addNode(job);
  }

  public newJob(lambda: ILambda, defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {}) {
    const job = new Job(this.graph.getNewID(), lambda, defaultCreateFunctionRequest);
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

  public getReadiedJobs(): Array<[Job, IWoolfResult[]]> {
      const readiedJobs = this.graph.getNodes().filter(this.isReadiedJob.bind(this));
      const dataList = readiedJobs.map(this.getDataListForJob.bind(this));
      return _.zip(readiedJobs, dataList) as Array<[Job, IWoolfResult[]]>;
  }

  public isLastJob(job: Job): boolean {
    return this.graph.getToNodes(job).length === 0;
  }

  private getDataListForJob(job: Job): IWoolfResult[] {
    return this.graph.getFromNodes(job)
      .map((fromJob) => this.doneJobs.get(fromJob.id))
      .map((dl) => dl ? dl : []);
  }

  private isReadiedJob(job: Job): boolean {
    const fromJobs = this.graph.getFromNodes(job);
    return fromJobs.every((dependencyJob) => this.doneJobs.has(dependencyJob.id));
  }
}
