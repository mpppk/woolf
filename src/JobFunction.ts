import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { LambdaFunction } from 'lamool/src/lambda';

export class JobFunction {
  constructor(private params: CreateFunctionRequest, private func: LambdaFunction<any>) {}

}
