import { CreateFunctionRequest, FunctionConfiguration } from 'aws-sdk/clients/lambda';
import { LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';
import { reduce } from 'p-iteration';
import { IWoolfFuncEventContext } from './eventHandlers';
import { EventManager } from './eventManager';
import { ILambda } from './lambda/ILambda';
import { PLambda } from './lambda/PLambda';
import { IWoolfPayload, IWoolfResult } from './models';

export interface IJobOption {
  name: string;
  workflowName: string;
  eventManager: EventManager;
}

export class Job {
  public name: string;
  private plambda: PLambda;
  private funcNames: string[] = [];
  private readonly workflowName: string;
  private readonly eventManager: EventManager;

  constructor(public id: number, lambda: ILambda,
              private defaultCreateFunctionRequest: Partial<CreateFunctionRequest> = {},
              jobOption: Partial<IJobOption> = {}) {
    this.plambda = new PLambda(lambda);
    this.name = jobOption.name ? jobOption.name : 'job' + id;
    this.workflowName = jobOption.workflowName ? jobOption.workflowName : 'unknown';
    this.eventManager = jobOption.eventManager ? jobOption.eventManager : new EventManager();
  }

  public async addFunc<T, U = T>(func: LambdaFunction<IWoolfPayload<T>, U>, params: Partial<CreateFunctionRequest> = {}): Promise<FunctionConfiguration | null> {
    const funcName = this.name + '-' + (params.FunctionName ? params.FunctionName : 'function' + this.funcNames.length);

    const combinedParams = {
      ...this.defaultCreateFunctionRequest,
      ...params,
      Code: {ZipFile: funcToZip(func)},
      FunctionName: funcName,
    };

    const eventContext = {...this.getBaseEventContext(), funcName};
    this.eventManager.dispatchAddFuncEvent(eventContext);
    this.funcNames.push(funcName);
    return await this.plambda.createFunction(combinedParams as CreateFunctionRequest); // FIXME
  }

  public async run(payload: IWoolfPayload): Promise<IWoolfResult> {
    const resultPayload = await reduce(this.funcNames, async (accData: IWoolfPayload, funcName: string) => {
      const context = {
        ...this.getBaseEventContext(),
        funcName,
        payload: accData,
        result: {},
      };
      this.eventManager.dispatchStartFuncEvent(context);
      try {
        const result: IWoolfResult = await this.plambda.invoke({
          FunctionName: funcName,
          Payload: JSON.stringify(accData),
        });
        this.eventManager.dispatchFinishFuncEvent({...context, result});
        return {data: [result]};
      } catch (e) {
        throw new Error(`failed to execute function: currentData: ${JSON.stringify(accData)}, funcName: ${funcName},  registered functions: ${this.funcNames}, ${e.message}`);
      }
    }, payload);
    return resultPayload.data[0];
  }

  private getBaseEventContext(): Pick<IWoolfFuncEventContext, 'jobName' | 'workflowName'> {
    return {
      jobName: this.name,
      workflowName: this.workflowName,
    }
  }
}
