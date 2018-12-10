import { map } from 'p-iteration';
import { Job } from './job';
import { Data } from './models';

export class Stage {
  private jobs: Job[] = [];

  public addJob(job: Job) {
    this.jobs.push(job);
  }

  public run(data: Data): Promise<Data> {
    if (this.jobs.length < 1) {
      return Promise.resolve({});
    }
    if (this.jobs.length === 1) {
      return this.jobs[0].run(data);
    }
    return map(this.jobs, async (job) => job.run(data));
  }
}
