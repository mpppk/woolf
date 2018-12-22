import { CreateFunctionRequest, FunctionConfiguration } from 'aws-sdk/clients/lambda';
import { LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';
import { reduce } from 'p-iteration';
import { ILambda } from './lambda/ILambda';
import { PLambda } from './lambda/PLambda';
import { IWoolfResult } from './models';

export interface IJobOption {
  name: string;
}

export class Job {
  public name: string;
  private plambda: PLambda;
  private funcNames: string[] = [];

  constructor(public id: number, lambda: ILambda,
              private defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {},
              jobOption: Partial<IJobOption> = {}) {
    this.plambda = new PLambda(lambda);
    this.name = jobOption.name ? jobOption.name : 'job' + id;
  }

  public async addFunc<T, U = T>(func: LambdaFunction<T, U>, params: Partial<CreateFunctionRequest> = {}): Promise<FunctionConfiguration | null> {
    const functionName = this.name + '-' + (params.FunctionName ? params.FunctionName : 'function' + this.funcNames.length);

    const combinedParams = {
      ...this.defaultCreateFunctionRequest,
      ...params,
      Code: {ZipFile: funcToZip(func)},
      FunctionName: functionName,
    };

    this.funcNames.push(functionName);
    try {
      return await this.plambda.createFunction(combinedParams as CreateFunctionRequest); // FIXME
    } catch (e) {
      return null; // FIXME
    } // tslint:disable-line
  }

  public async run(data: IWoolfResult): Promise<IWoolfResult> {
    return await reduce(this.funcNames, async (accData, funcName) => {
      try {
        return await this.plambda.invoke({
          FunctionName: funcName,
          Payload: JSON.stringify(accData),
        });
      } catch (e) {
        throw new Error(`failed to execute function: currentData: ${JSON.stringify(accData)}, funcName: ${funcName},  ${e.message}`);
      } }, data);
  }
}
