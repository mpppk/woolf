import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';
import { JobFuncStat, JobFuncState } from '../../src/job';

export const generateCreateFunctionRequest = <T>(name: string, handler: LambdaFunction<T>): CreateFunctionRequest => {
  // tslint:disable-line
  return {
    Code: { ZipFile: funcToZip(handler) },
    FunctionName: name,
    Handler: 'index.handler',
    Role: '-',
    Runtime: 'nodejs8.10'
  };
};

interface ICountData {
  count: number;
}

export const countUpLambdaFunction: LambdaFunction<ICountData | ICountData[], ICountData> = (event, _, cb) => {
  let newEvents;
  if (Array.isArray(event)) {
    newEvents = event;
  } else {
    newEvents = [event];
  }

  const count = newEvents.reduce((a, e) => a + e.count, 1);
  cb(null, { count });
};

export const generateDefaultFuncStat = (): JobFuncStat => {
  return {
    Code: () => {}, // tslint:disable-line no-empty
    FunctionName: 'job0-function0',
    Handler: 'index.handler',
    InputPath: '$',
    OutputPath: '$',
    Parameters: {},
    ResultPath: '$',
    Role: '-',
    Runtime: 'nodejs8.10',
    state: JobFuncState.Ready
  };
};
