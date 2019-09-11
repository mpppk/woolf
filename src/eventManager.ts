import {
  IWoolfAddFuncEventContext,
  IWoolfBaseJobEventContext,
  IWoolfEventHandlers,
  IWoolfFinishJobEventContext,
  IWoolfFuncEventContext,
  IWoolfJobEventContext,
  IWoolfWFEventContext,
  WoolfEventHandler
} from './eventHandlers';
import { IWoolfData } from './models';

const emptyWoolfEventHandlers: IWoolfEventHandlers = {
  addFunc: [],
  addNewJob: [],
  change: [],
  failFunc: [],
  finish: [],
  finishFunc: [],
  finishJob: [],
  start: [],
  startFunc: [],
  startJob: []
};

type WoolfEventName = keyof IWoolfEventHandlers;

export class EventManager {
  public static getWFContext(workflowName: string, payload: IWoolfData, result?: IWoolfData): IWoolfWFEventContext {
    return { workflowName, payload, result: result ? result : {} };
  }
  public static getBaseJobContext(workflowName: string, jobName: string): IWoolfBaseJobEventContext {
    return { workflowName, jobName };
  }
  public static getJobContext(
    workflowName: string,
    jobName: string,
    payload: IWoolfData,
    result?: IWoolfData
  ): IWoolfJobEventContext {
    const wfContext = EventManager.getWFContext(workflowName, payload, result);
    return { ...wfContext, jobName };
  }

  constructor(private eventHandlers: IWoolfEventHandlers = emptyWoolfEventHandlers) {}

  public updateEventHandlers(eventHandlers: Partial<IWoolfEventHandlers>) {
    this.eventHandlers = {
      ...this.eventHandlers,
      ...eventHandlers
    };
  }

  public dispatchEvent(eventName: WoolfEventName, context: any) {
    const eventHandler: Array<WoolfEventHandler<any>> = this.eventHandlers[eventName]; // FIXME
    eventHandler.forEach(cb => cb(eventName, context));
  }

  public dispatchAddNewJobEvent(context: IWoolfBaseJobEventContext) {
    this.dispatchEvent('addNewJob', context);
  }

  public dispatchStartJobEvent(context: IWoolfJobEventContext) {
    this.dispatchEvent('startJob', context);
  }

  public dispatchFinishJobEvent(context: IWoolfFinishJobEventContext) {
    this.dispatchEvent('finishJob', context);
  }

  public dispatchStartEvent(context: IWoolfWFEventContext) {
    this.dispatchEvent('start', context);
  }

  public dispatchFinishEvent(context: IWoolfWFEventContext) {
    this.dispatchEvent('finish', context);
  }

  public dispatchAddFuncEvent(context: IWoolfAddFuncEventContext) {
    this.dispatchEvent('addFunc', context);
  }

  public dispatchStartFuncEvent(context: IWoolfFuncEventContext) {
    this.dispatchEvent('startFunc', context);
  }

  public dispatchFinishFuncEvent(context: IWoolfFuncEventContext) {
    this.dispatchEvent('finishFunc', context);
  }

  public dispatchFailFuncEvent(context: IWoolfFuncEventContext) {
    this.dispatchEvent('failFunc', context);
  }
}
