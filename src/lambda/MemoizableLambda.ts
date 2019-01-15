import { AWSError } from 'aws-sdk';
import { CreateFunctionRequest, Types } from 'aws-sdk/clients/lambda';
import * as Lambda from 'aws-sdk/clients/lambda';
import { Callback, IInvokeParams, InvokeCallback, ListFunctionsCallback } from 'lamool/src/lambda';
import { ILambda } from './ILambda';

export class MemoizableLambda implements ILambda{
  private static generateCacheKey(functionName: string, payload?: string): string {
    return `FunctionName:${functionName}, Payload:${payload}`;
  }
  private cache: Map<string, [AWSError | null, Types.InvocationResponse | null]> = new Map();

  constructor(private lambda: ILambda) { }

  public createFunction(params: CreateFunctionRequest, callback?: Callback<Types.FunctionConfiguration>): void {
    this.lambda.createFunction(params, callback);
  }

  public invoke(params: IInvokeParams, callback: InvokeCallback): void {
    const cacheKey = MemoizableLambda.generateCacheKey(params.FunctionName, params.Payload);
    if (this.cache.has(cacheKey)) {
      const [err, data] = this.cache.get(cacheKey)!;
      callback(err, data);
    }

    const callbackProxy: InvokeCallback = (err, data) => {
      this.cache.set(params.FunctionName, [err, data]);
      callback(err, data);
    };
    this.lambda.invoke(params, callbackProxy);
  }

  public listFunctions(params: Lambda.ListFunctionsRequest, callback: ListFunctionsCallback): void {
    this.lambda.listFunctions(params, callback);
  }
}
