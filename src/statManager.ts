import { JobFuncStat } from './job';
import { IWoolfData } from './models';

export class StatManager {
  private jobStatEventMap = new Map<number, IWoolfData>();
  private jobStatResultsMap = new Map<number, IWoolfData | IWoolfData[]>();
  private funcStatEventMap = new Map<string, IWoolfData>();
  private funcStatResultsMap = new Map<string, IWoolfData | IWoolfData[]>();

  public updateJobEvent(id: number, event: IWoolfData | IWoolfData[]) {
    this.jobStatEventMap.set(id, event);
  }

  public updateJobResults(id: number, results: IWoolfData | IWoolfData[]) {
    this.jobStatResultsMap.set(id, results);
  }

  public updateFuncEvent(name: string, event: IWoolfData | IWoolfData[]) {
    this.funcStatEventMap.set(name, event);
  }

  public updateFuncResults(name: string, results: IWoolfData | IWoolfData[]) {
    this.funcStatResultsMap.set(name, results);
  }

  public getJobEventAndResults(id: number): Pick<JobFuncStat, 'event' | 'results'> {
    const event = this.jobStatEventMap.get(id);
    const results = this.jobStatResultsMap.get(id);
    return { event, results };
  }

  public newFuncStat(funcStat: JobFuncStat): JobFuncStat {
    const event = this.funcStatEventMap.get(funcStat.FunctionName);
    const results = this.funcStatResultsMap.get(funcStat.FunctionName);
    return { ...funcStat, event, results };
  }
}
