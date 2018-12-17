import { IPayload } from 'lamool/src/lambda';

export interface IWoolfResult {[key: string]: any}
export interface IWoolfPayload<T = IPayload> {data: T[]}
