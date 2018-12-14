import { CreateFunctionRequest, Types } from 'aws-sdk/clients/lambda';
import { IInvokeParams } from 'lamool/src/lambda';
import { Data } from '../models';
import { ILambda } from './ILambda';

export class PLambda {
  constructor(private lamool: ILambda) { }

  public async createFunction(params: CreateFunctionRequest): Promise<Types.FunctionConfiguration> {
     return await new Promise((resolve, reject) => {
      this.lamool.createFunction(params, (err, data) => {
        if (err) { reject(err); }
        resolve(data as Types.FunctionConfiguration); // FIXME
      });
    });
  };

  public async invoke(invokeParams: IInvokeParams) {
    const result: Data = await new Promise((resolve, reject) => {
      this.lamool.invoke(invokeParams, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data || {});
      });
    });

    if (!result) { throw new Error('data is empty') }
    if (!result.Payload) { throw new Error('payload is empty') }

    if (typeof result.Payload !== 'string') {
      throw new Error('PLambda only support string type payload currently');
    }

    let payload;
    try {
      payload = JSON.parse(result.Payload);
    } catch (e) {
      throw new Error('failed to parse payload to json: ' + e);
    }

    if (result.FunctionError === 'Handled') {
      throw new Error(`error type:${payload.errorType} message:${payload.error}`);
    }

    return payload;
  }
}
