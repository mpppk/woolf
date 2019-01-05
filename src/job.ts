import { CreateFunctionRequest, FunctionConfiguration } from 'aws-sdk/clients/lambda';
import * as jp from 'jsonpath';
import { IPayload, LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';
import { reduce } from 'p-iteration';
import { applyParameters } from './applyParameters';
import { IWoolfFuncEventContext } from './eventHandlers';
import { EventManager } from './eventManager';
import { ILambda } from './lambda/ILambda';
import { PLambda } from './lambda/PLambda';
import { mergeByResultPath } from './mergeByResultPath';
import { IWoolfData } from './models';

export interface IJobOption {
  name: string;
  workflowName: string;
  eventManager: EventManager;
}

export interface IJobFuncOption extends CreateFunctionRequest {
  InputPath: string,
  ResultPath: string,
  OutputPath: string,
  Parameters: {[k: string]: any},
}

export type DefaultJobFuncOption =
  Pick<IJobFuncOption, 'Handler' | 'Role' | 'Runtime' | 'InputPath' | 'ResultPath' | 'OutputPath' | 'Parameters'>

export class Job {
  public name: string;
  private plambda: PLambda;
  private funcOptions: Map<string, IJobFuncOption> = new Map();
  private readonly workflowName: string;
  private readonly eventManager: EventManager;
  private readonly defaultJobFuncOption: DefaultJobFuncOption & Partial<IJobFuncOption>;

  constructor(public id: number, lambda: ILambda,
              jobFuncOpt: Partial<IJobFuncOption> = {},
              jobOption: Partial<IJobOption> = {}) {
    this.plambda = new PLambda(lambda);
    this.name = jobOption.name ? jobOption.name : 'job' + id;
    this.workflowName = jobOption.workflowName ? jobOption.workflowName : 'unknown';
    this.eventManager = jobOption.eventManager ? jobOption.eventManager : new EventManager();
    this.defaultJobFuncOption = {
      ...defaultJobFuncOption,
      ...jobFuncOpt,
    }
  }

  public async addFunc<T = IWoolfData, U = T>(func: LambdaFunction<T, U>, params: Partial<IJobFuncOption> = {}): Promise<FunctionConfiguration | null> {
    const funcName = this.name + '-' + (params.FunctionName ? params.FunctionName : 'function' + this.getFuncNames().length);

    const combinedParams = {
      ...this.defaultJobFuncOption,
      ...params,
      Code: {ZipFile: funcToZip(func)},
      FunctionName: funcName,
    };

    const eventContext = {...this.getBaseEventContext(), funcName};
    this.eventManager.dispatchAddFuncEvent(eventContext);
    this.funcOptions.set(funcName, combinedParams);
    return await this.plambda.createFunction(combinedParams as CreateFunctionRequest); // FIXME
  }

  public async run(payload: IWoolfData): Promise<IWoolfData> {
    return await reduce(this.getFuncNames(), async (accData: IWoolfData, funcName: string) => {
      const context = {
        ...this.getBaseEventContext(),
        funcName,
        payload: accData,
        result: {},
      };
      this.eventManager.dispatchStartFuncEvent(context);
      const result = await this.executeFuncWithPaths(funcName, accData);
      this.eventManager.dispatchFinishFuncEvent({
        ...context,
        result,
      });
      return result;
    }, payload);
  }

  private async executeFuncWithPaths(funcName: string, data: IWoolfData | IWoolfData[]): Promise<IWoolfData> {
    const funcOpt = this.funcOptions.get(funcName);
    if (!funcOpt) {
      throw new Error('func option not found. function name: ' + funcName);
    }
    const filteredByInputPathPayload = queryByJsonPath(data, funcOpt.InputPath);
    if (filteredByInputPathPayload === null) {
      throw new Error(`invalid InputPath(${funcOpt.InputPath}): original payload: ${data}`);
    }

    const parameterAppliedPayload = applyParameters(filteredByInputPathPayload, funcOpt.Parameters);

    let result: IWoolfData;
    try {
      result = await this.plambda.invoke({
        FunctionName: funcName,
        Payload: JSON.stringify(parameterAppliedPayload),
      });
    } catch (e) {
      throw new Error(`failed to execute function: currentData: ${JSON.stringify(data)}, funcName: ${funcName},  registered functions: ${this.getFuncNames()}, ${e.message}`);
    }
    const mergedResult = mergeByResultPath(parameterAppliedPayload, result, funcOpt.ResultPath);
    const output = queryByJsonPath(mergedResult, funcOpt.OutputPath);
    if (output === null) {
      throw new Error(`invalid OutputPath(${funcOpt.OutputPath}): original payloads: ${mergedResult}`);
    }
    return output;
  }

  private getBaseEventContext(): Pick<IWoolfFuncEventContext, 'jobName' | 'workflowName'> {
    return {
      jobName: this.name,
      workflowName: this.workflowName,
    }
  }

  private getFuncNames(): string[] {
    return Array.from(this.funcOptions.keys());
  }
}

const queryByJsonPath = (data: IPayload | IPayload[], query: string): any | null => {
  const results = jp.query(data, query);
  if (results.length <= 0) {
    return null;
  }
  return results[0];
};

const defaultJobFuncOption: DefaultJobFuncOption = {
  Handler: 'index.handler',
  InputPath: '$',
  OutputPath: '$',
  Parameters: {},
  ResultPath: '$',
  Role: '-',
  Runtime: 'nodejs8.10',
};
