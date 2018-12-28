import { IWoolfPayload, IWoolfResult } from './models';

export interface IWoolfWFEventContext {
  workflowName: string;
  payload: IWoolfPayload;
  result: IWoolfResult;
}

export interface IWoolfBaseJobEventContext {
  workflowName: string;
  jobName: string;
}

export interface IWoolfJobEventContext extends IWoolfBaseJobEventContext{
  payload: IWoolfPayload;
  result: IWoolfResult;
}

export interface IWoolfAddFuncEventContext extends IWoolfBaseJobEventContext {
  funcName: string;
}

export interface IWoolfFuncEventContext extends IWoolfJobEventContext {
  funcName: string;
}

export type WoolfEventContext = IWoolfWFEventContext & IWoolfJobEventContext & IWoolfFuncEventContext;

export type WoolfEventHandler<T> = (type: string, context: T) => void;

export type WoolfFuncEvent = 'addFunc' | 'startFunc' | 'finishFunc';
export type WoolfJobEvent = 'addNewJob' | 'startJob' | 'finishJob';
export type WoolfWFEvent = 'start' | 'finish' | 'change';

type IWoolfFuncEventHandlers = Record<WoolfFuncEvent, Array<WoolfEventHandler<IWoolfFuncEventContext>>>;
type IWoolfJobEventHandlers = Record<WoolfJobEvent, Array<WoolfEventHandler<IWoolfJobEventContext>>>;
type IWoolfWFEventHandlers = Record<WoolfWFEvent, Array<WoolfEventHandler<IWoolfWFEventContext>>>;
export type IWoolfEventHandlers = IWoolfJobEventHandlers & IWoolfWFEventHandlers & IWoolfFuncEventHandlers;
