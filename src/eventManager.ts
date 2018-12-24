import {
  IWoolfEventHandlers,
  IWoolfJobEventContext, IWoolfWFEventContext,
  WoolfEventContext,
  WoolfEventHandler
} from './eventHandlers';

const emptyWoolfEventHandlers: IWoolfEventHandlers = {
  addNewJob: [],
  change: [],
  finish: [],
  finishJob: [],
  start: [],
  startJob: []
};

type WoolfEventName = keyof IWoolfEventHandlers;

export class EventManager {
  private static getWFContext(workflowName: string): IWoolfWFEventContext {
    return {workflowName};
  }
  private static getJobContext(workflowName: string, jobName: string): IWoolfJobEventContext {
    return {workflowName, jobName};
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
    eventHandler.forEach((cb) => cb(eventName, context));
  }

  public dispatchAddNewJobEvent(workflowName: string, jobName: string){
    this.dispatchEvent('addNewJob', EventManager.getJobContext(workflowName, jobName));
  }

  public dispatchStartJobEvent(workflowName: string, jobName: string){
    this.dispatchEvent('startJob', EventManager.getJobContext(workflowName, jobName));
  }

  public dispatchFinishJobEvent(workflowName: string, jobName: string) {
    this.dispatchEvent('finishJob', EventManager.getJobContext(workflowName, jobName));
  }

  public dispatchStartEvent(workflowName: string) {
    this.dispatchEvent('start', EventManager.getWFContext(workflowName));
  }

  public dispatchFinishEvent(workflowName: string) {
    this.dispatchEvent('finish', EventManager.getWFContext(workflowName));
  }
}
