export interface IWoolfWFEventContext {
  workflowName: string;
}

export interface IWoolfJobEventContext extends IWoolfWFEventContext{
  jobName: string;
}

export type WoolfEventContext = IWoolfWFEventContext & IWoolfJobEventContext;

export type WoolfEventHandler<T> = (type: string, context: T) => void;

export type WoolfJobEvent = 'addNewJob' | 'startJob' | 'finishJob';
export type WoolfWFEvent = 'start' | 'finish' | 'change';

type IWoolfJobEventHandlers = Record<WoolfJobEvent, Array<WoolfEventHandler<IWoolfJobEventContext>>>;
type IWoolfWFEventHandlers = Record<WoolfWFEvent, Array<WoolfEventHandler<IWoolfWFEventContext>>>;
export type IWoolfEventHandlers = IWoolfJobEventHandlers & IWoolfWFEventHandlers;
