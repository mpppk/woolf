import { CreateFunctionRequest, FunctionConfiguration } from 'aws-sdk/clients/lambda';
// @ts-ignore
import jp = require('jsonpath/jsonpath.min');
import { LambdaEnvironment } from 'lamool';
import { IPayload, LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';
import _ = require('lodash');
import { reduce } from 'p-iteration';
import { applyParameters } from './applyParameters';
import { IWoolfFuncEventContext } from './eventHandlers';
import { EventManager } from './eventManager';
import { ILambda, InvocationAcceptanceCallback } from './lambda/ILambda';
import { PLambda } from './lambda/PLambda';
import { mergeByResultPath } from './mergeByResultPath';
import { IWoolfData } from './models';
import { JobEnvironment } from './scheduler/scheduler';
import { StatManager } from './statManager';
import { Omit } from './types';

export enum JobFuncState {
  Processing = 'PROCESSING',
  Done = 'DONE',
  Ready = 'READY'
}

export interface IJobOption {
  name: string;
  workflowName: string;
  eventManager: EventManager;
}

export interface IJobFuncOption extends CreateFunctionRequest {
  InputPath: string;
  ResultPath: string;
  OutputPath: string;
  Parameters: { [k: string]: any };
}

export interface IJobFuncInfo extends IJobFuncOption {
  state: JobFuncState;
}

export type JobFuncStat = Omit<IJobFuncInfo, 'Code'> & {
  Code: LambdaFunction<any, any>;
  event?: IWoolfData;
  results?: IWoolfData | IWoolfData[];
};
export type DefaultJobFuncOption = Pick<
  IJobFuncOption,
  'Handler' | 'Role' | 'Runtime' | 'InputPath' | 'ResultPath' | 'OutputPath' | 'Parameters'
>;

export class Job {
  public name: string;
  public environment: JobEnvironment = 'pending';
  private plambda: PLambda;
  private funcStatMap: Map<string, JobFuncStat> = new Map();
  private readonly workflowName: string;
  private readonly eventManager: EventManager;
  private readonly defaultJobFuncOption: DefaultJobFuncOption & Partial<IJobFuncOption>;
  private statManager = new StatManager();

  constructor(
    public id: number,
    lambda: ILambda,
    jobFuncOpt: Partial<IJobFuncOption> = {},
    jobOption: Partial<IJobOption> = {}
  ) {
    this.plambda = new PLambda(lambda);
    this.name = jobOption.name ? jobOption.name : 'job' + id;
    this.workflowName = jobOption.workflowName ? jobOption.workflowName : 'unknown';
    this.eventManager = jobOption.eventManager ? jobOption.eventManager : new EventManager();
    this.defaultJobFuncOption = {
      ...defaultJobFuncOption,
      ...jobFuncOpt
    };
  }

  public async addFunc<T = IWoolfData, U = T>(
    func: LambdaFunction<T, U>,
    params: Partial<IJobFuncOption> = {}
  ): Promise<FunctionConfiguration | null> {
    const funcName =
      this.name + '-' + (params.FunctionName ? params.FunctionName : 'function' + this.getFuncNames().length);

    const combinedParams = {
      ...this.defaultJobFuncOption,
      ...params,
      Code: { ZipFile: funcToZip(func) },
      FunctionName: funcName
    };

    const eventContext = { ...this.getBaseEventContext(), funcName };
    this.eventManager.dispatchAddFuncEvent(eventContext);
    const funcStat: JobFuncStat = {
      ...combinedParams,
      Code: func,
      state: JobFuncState.Ready
    };
    this.funcStatMap.set(funcName, funcStat);
    return await this.plambda.createFunction(combinedParams as CreateFunctionRequest); // FIXME
  }

  public async run(payload: IWoolfData): Promise<IWoolfData> {
    const reduceFunc = async (accData: IWoolfData, funcName: string) => {
      let context: IWoolfFuncEventContext | null = null;
      const callback: InvocationAcceptanceCallback = res => {
        this.environment = res.environment;
        context = this.dispatchStartFuncEvent(funcName, accData, res.environment);
      };
      const result = await this.executeFuncWithPaths(funcName, accData, callback.bind(this));
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      while (true) {
        if (context !== null) {
          this.dispatchFinishFuncEvent(context, result);
          return result;
        }
        await sleep(50);
      }
    };
    this.statManager.updateJobEvent(this.id, _.cloneDeep(payload));
    const results = await reduce(this.getFuncNames(), reduceFunc, payload);
    // FIXME
    this.statManager.updateJobResults(this.id, _.cloneDeep(results));
    return results;
  }

  public getFuncStats(): JobFuncStat[] {
    const funcInfoList = Array.from(this.funcStatMap.values());
    return funcInfoList.map(
      (funcInfo): JobFuncStat => {
        const newFuncInfo = { ...funcInfo };
        return this.statManager.newFuncStat(newFuncInfo);
      }
    );
  }

  public getEventsAndResults(): Pick<JobFuncStat, 'event' | 'results'> {
    return this.statManager.getJobEventAndResults(this.id);
  }

  private dispatchStartFuncEvent(
    funcName: string,
    data: IWoolfData,
    environment: LambdaEnvironment
  ): IWoolfFuncEventContext {
    this.statManager.updateFuncEvent(funcName, data);
    this.updateFuncState(funcName, JobFuncState.Processing);
    const context: IWoolfFuncEventContext = {
      ...this.getBaseEventContext(),
      environment,
      funcName,
      funcStats: this.getFuncStats(),
      payload: data,
      result: {}
    };
    this.eventManager.dispatchStartFuncEvent(context);
    return context;
  }

  private dispatchFinishFuncEvent(context: IWoolfFuncEventContext, result: IWoolfData) {
    this.statManager.updateFuncResults(context.funcName, result);
    this.updateFuncState(context.funcName, JobFuncState.Done);
    this.eventManager.dispatchFinishFuncEvent({
      ...context,
      funcStats: this.getFuncStats(),
      result
    });
  }

  private async executeFuncWithPaths(
    funcName: string,
    data: IWoolfData | IWoolfData[],
    invocationAcceptanceCallback?: InvocationAcceptanceCallback
  ): Promise<IWoolfData> {
    const funcOpt = this.funcStatMap.get(funcName);
    if (!funcOpt) {
      throw new Error('func option not found. function name: ' + funcName);
    }
    const parameterAppliedPayload = preprocessPayload(data, funcOpt.InputPath, funcOpt.Parameters);

    let result: IWoolfData;
    try {
      result = await this.plambda.invoke(
        {
          FunctionName: funcName,
          Payload: JSON.stringify(parameterAppliedPayload)
        },
        invocationAcceptanceCallback
      );
    } catch (e) {
      throw new Error(
        `failed to execute function: currentData: ${JSON.stringify(
          data
        )}, funcName: ${funcName},  registered functions: ${this.getFuncNames()}, ${e.message}`
      );
    }
    return postprocessResults(parameterAppliedPayload, result, funcOpt.OutputPath, funcOpt.ResultPath);
  }

  private getBaseEventContext(): Pick<IWoolfFuncEventContext, 'jobName' | 'workflowName'> {
    return {
      jobName: this.name,
      workflowName: this.workflowName
    };
  }

  private getFuncNames(): string[] {
    return Array.from(this.funcStatMap.keys());
  }

  private updateFuncState(funcName: string, newState: JobFuncState) {
    const funcInfo = this.funcStatMap.get(funcName);
    if (funcInfo === undefined) {
      throw new Error(
        `failed to update JobFuncState to ${newState} because JobFuncInfo does not exist which named ` + funcName
      );
    }

    this.funcStatMap.set(funcName, {
      ...funcInfo,
      state: newState
    });
  }
}

// tslint:disable-next-line variable-name
const preprocessPayload = (data: IPayload | IPayload[], InputPath: string, Parameters: IPayload) => {
  const filteredByInputPathPayload = queryByJsonPath(data, InputPath);
  if (filteredByInputPathPayload === null) {
    throw new Error(`invalid InputPath(${InputPath}): original payload: ${data}`);
  }
  return applyParameters(filteredByInputPathPayload, Parameters);
};

const postprocessResults = (
  preprocessedPayload: IPayload | IPayload[],
  result: IPayload | IPayload[],
  OutputPath: string, // tslint:disable-line variable-name
  ResultPath: string // tslint:disable-line variable-name
) => {
  const mergedResult = mergeByResultPath(preprocessedPayload, result, ResultPath);
  const output = queryByJsonPath(mergedResult, OutputPath);
  if (output === null) {
    throw new Error(`invalid OutputPath(${OutputPath}): original payloads: ${mergedResult}`);
  }
  return output;
};

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
  Runtime: 'nodejs8.10'
};
