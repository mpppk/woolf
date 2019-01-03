import { CreateFunctionRequest, FunctionConfiguration } from 'aws-sdk/clients/lambda';
import * as jp from 'jsonpath';
import { LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';
import { reduce } from 'p-iteration';
import { IWoolfFuncEventContext } from './eventHandlers';
import { EventManager } from './eventManager';
import { mergeByResultPath } from './mergeByResultPath';
import { ILambda } from './lambda/ILambda';
import { PLambda } from './lambda/PLambda';
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
}

export type DefaultJobFuncOption =
  Pick<IJobFuncOption, 'Handler' | 'Role' | 'Runtime' | 'InputPath' | 'ResultPath' | 'OutputPath'>

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

  private async executeFuncWithPaths(funcName: string, data: IWoolfData): Promise<IWoolfData> {
    const funcOpt = this.funcOptions.get(funcName);
    if (!funcOpt) {
      throw new Error('func option not found. function name: ' + funcName);
    }
    const filteredPayloads = jp.query(data, funcOpt.InputPath);
    if (filteredPayloads.length <= 0) {
      throw new Error(`invalid InputPath(${funcOpt.InputPath}): payload: ${data}`);
    }
    const filteredPayload = filteredPayloads[0];
    let result: IWoolfData;
    try {
      result = await this.plambda.invoke({
        FunctionName: funcName,
        Payload: JSON.stringify(filteredPayload),
      });
    } catch (e) {
      throw new Error(`failed to execute function: currentData: ${JSON.stringify(data)}, funcName: ${funcName},  registered functions: ${this.getFuncNames()}, ${e.message}`);
    }
    const mergedResult = mergeByResultPath(filteredPayload, result, funcOpt.ResultPath);
    return jp.query(mergedResult, funcOpt.OutputPath)[0];
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

const defaultJobFuncOption: DefaultJobFuncOption = {
  Handler: 'index.handler',
  InputPath: '$',
  OutputPath: '$',
  ResultPath: '$',
  Role: '-',
  Runtime: 'nodejs8.10',
};
