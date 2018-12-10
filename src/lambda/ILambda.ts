import { CreateFunctionRequest, Types } from 'aws-sdk/clients/lambda';
import { Callback, IInvokeParams, InvokeCallback } from 'lamool/src/lambda';

export interface ILambda {
  createFunction(params: CreateFunctionRequest, callback?: Callback<Types.FunctionConfiguration>): void;
  invoke(params: IInvokeParams, callback: InvokeCallback): void;
}

