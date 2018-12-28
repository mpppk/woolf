import { CreateFunctionRequest, ListFunctionsRequest, Types } from 'aws-sdk/clients/lambda';
import { Callback, IInvokeParams, InvokeCallback, ListFunctionsCallback } from 'lamool/src/lambda';

export interface ILambda {
  createFunction(params: CreateFunctionRequest, callback?: Callback<Types.FunctionConfiguration>): void;
  listFunctions(params: ListFunctionsRequest, callback: ListFunctionsCallback): void;
  invoke(params: IInvokeParams, callback: InvokeCallback): void;
}

