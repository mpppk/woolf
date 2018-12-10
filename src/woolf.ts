import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { Job } from './job';
import { ILambda } from './lambda/ILambda';

export class Woolf {
  constructor(private lambda: ILambda, private defaultCreateFunctionRequest: Partial<CreateFunctionRequest>) {}

  public newJob(): Job {
    return new Job(this.lambda, this.defaultCreateFunctionRequest);
  }
}
