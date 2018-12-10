import { reduce } from 'p-iteration';
import { Data } from './models';
import { Stage } from './Stage';

export class Pipeline {
  private stages: Stage[] = [];

  public addStage(stage: Stage) {
    this.stages.push(stage);
  }

  public run(data: Data): Promise<Data> {
    return reduce(this.stages, async (accData, stage) => {
      return stage.run(accData);
    }, data);
  }
}
