import { IPayload } from 'lamool/src/lambda';

export type IWoolfData = IPayload;
export interface IWoolfPayload<T = IPayload> {data: T[]}
