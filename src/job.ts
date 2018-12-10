import { Lamool } from 'lamool';
import { LambdaFunction } from 'lamool/src/lambda';
import { CreateFunctionRequest, FunctionConfiguration } from 'aws-sdk/clients/lambda';
import { PLamool } from './lambda/PLamool';
import { Pipeline } from './Pipeline';

export class Job {
  private dependJobs: Job[] = [];
  private plamool: PLamool;
  private funcNames: string[] = [];
  constructor(lamool: Lamool, private pipeline: Pipeline) {
    this.plamool = new PLamool(lamool);
  }

  public async addFunc(params: CreateFunctionRequest): Promise<FunctionConfiguration | null> {
    this.funcNames.push(params.FunctionName);
    try {
      return await this.plamool.createFunction(params);
    } catch (e) { return null; } // tslint:disable-line
  }

  public dependTo(job: Job) {
    this.dependJobs.push(job);
  }

  public run(): any {
    this.dependJobs.forEach((dependJob) => {
      dependJob.
    });
    this.lamool.invoke()
  }
}
