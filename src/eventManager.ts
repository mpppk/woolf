import {
  IWoolfEventHandlers,
  IWoolfJobEventContext,
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
  private static getAddNewJobContext(workflowName: string, jobName: string): IWoolfJobEventContext {
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

  public triggerAddNewJob(workflowName: string, jobName: string){
    this.dispatchEvent('addNewJob', EventManager.getAddNewJobContext(workflowName, jobName));
  }
}
