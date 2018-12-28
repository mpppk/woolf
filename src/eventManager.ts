import {
  IWoolfAddFuncEventContext,
  IWoolfBaseJobEventContext,
  IWoolfEventHandlers,
  IWoolfJobEventContext,
  IWoolfWFEventContext,
  WoolfEventContext,
  WoolfEventHandler
} from './eventHandlers';
import { IWoolfPayload, IWoolfResult } from './models';

const emptyWoolfEventHandlers: IWoolfEventHandlers = {
  addFunc: [],
  addNewJob: [],
  change: [],
  finish: [],
  finishFunc: [],
  finishJob: [],
  start: [],
  startFunc: [],
  startJob: []
};

type WoolfEventName = keyof IWoolfEventHandlers;

export class EventManager {
  public static getWFContext(
    workflowName: string,
    payload: IWoolfPayload,
    result?: IWoolfResult
  ): IWoolfWFEventContext {
    return { workflowName, payload, result: result ? result : {} };
  }
  public static getBaseJobContext(workflowName: string, jobName: string): IWoolfBaseJobEventContext {
    return { workflowName, jobName };
  }
  public static getJobContext(
    workflowName: string,
    jobName: string,
    payload: IWoolfPayload,
    result?: IWoolfResult
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
    const eventHandler: Array<WoolfEventHandler<WoolfEventContext>> = this.eventHandlers[eventName]; // FIXME
    eventHandler.forEach(cb => cb(eventName, context));
  }

  public dispatchAddNewJobEvent(context: IWoolfBaseJobEventContext) {
    this.dispatchEvent('addNewJob', context);
  }

  public dispatchStartJobEvent(context: IWoolfJobEventContext) {
    this.dispatchEvent('startJob', context);
  }

  public dispatchFinishJobEvent(context: IWoolfJobEventContext) {
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
}
