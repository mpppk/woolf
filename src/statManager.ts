import { IJobInOut, JobFuncStat } from './job';
import { IWoolfData } from './models';

export class StatManager {
  private jobStatPayloadMap = new Map<number, IWoolfData>();
  private jobStatResultsMap = new Map<number, IWoolfData | IWoolfData[]>();
  private funcStatEventMap = new Map<string, IWoolfData>();
  private funcStatPayloadMap = new Map<string, IWoolfData>();
  private funcStatResultsMap = new Map<string, IWoolfData | IWoolfData[]>();
  private funcStatRawResultsMap = new Map<string, IWoolfData | IWoolfData[]>();

  public updateJobPayload(id: number, event: IWoolfData | IWoolfData[]) {
    this.jobStatPayloadMap.set(id, event);
  }

  public updateJobResults(id: number, results: IWoolfData | IWoolfData[]) {
    this.jobStatResultsMap.set(id, results);
  }

  public updateFuncEvent(name: string, event: IWoolfData | IWoolfData[]) {
    this.funcStatEventMap.set(name, event);
  }

  public updateFuncPayload(name: string, payload: IWoolfData | IWoolfData[]) {
    this.funcStatPayloadMap.set(name, payload);
  }

  public updateFuncResults(name: string, results: IWoolfData | IWoolfData[]) {
    this.funcStatResultsMap.set(name, results);
  }

  public updateFuncRawResults(name: string, rawResults: IWoolfData | IWoolfData[]) {
    this.funcStatRawResultsMap.set(name, rawResults);
  }

  public getJobEventAndResults(id: number): Partial<IJobInOut> {
    const payload = this.jobStatPayloadMap.get(id);
    const results = this.jobStatResultsMap.get(id);
    return { payload, results };
  }

  public newFuncStat(funcStat: JobFuncStat): JobFuncStat {
    const event = this.funcStatEventMap.get(funcStat.FunctionName);
    const payload = this.funcStatPayloadMap.get(funcStat.FunctionName);
    const rawResults = this.funcStatRawResultsMap.get(funcStat.FunctionName);
    const results = this.funcStatResultsMap.get(funcStat.FunctionName);
    return { ...funcStat, payload, event, rawResults, results };
  }
}
