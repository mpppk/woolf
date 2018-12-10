import { CreateFunctionRequest, Types } from 'aws-sdk/clients/lambda';
import { IInvokeParams } from 'lamool/src/lambda';
import { ILambda } from './ILambda';

export class PLamool {
  constructor(private lamool: ILambda) { }

  public async createFunction(params: CreateFunctionRequest): Promise<Types.FunctionConfiguration> {
    return new Promise((resolve, reject) => {
      this.lamool.createFunction(params, (err, data) => {
        if (err) { reject(err); }
        resolve(data as Types.FunctionConfiguration); // FIXME
      });
    });
  };

  public async invoke(invokeParams: IInvokeParams) {
    return new Promise((resolve, reject) => {
        this.lamool.invoke(invokeParams, (err, data) => {
          if (err) { reject(err); return; }
          if (!data) { reject(new Error('data is empty')); return; }
          if (!data.Payload) { reject(new Error('payload is empty')); return; }
          resolve(data.Payload);
        })
      }
    );
  }
}
