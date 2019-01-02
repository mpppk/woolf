import { CreateFunctionRequest } from 'aws-sdk/clients/lambda';
import { LambdaFunction } from 'lamool/src/lambda';
import { funcToZip } from 'lamool/src/util';

export const generateCreateFunctionRequest = <T>(name: string, handler: LambdaFunction<T>): CreateFunctionRequest => { // tslint:disable-line
  return {
    Code: {ZipFile: funcToZip(handler)},
    FunctionName: name,
    Handler: 'index.handler',
    Role: '-',
    Runtime: 'nodejs8.10',
  };
};

interface ICountData {
  count: number;
}

export const countUpLambdaFunction: LambdaFunction<ICountData | ICountData[], ICountData> = (event, _, cb) => {
  let newEvents;
  if (Array.isArray(event)) {
    newEvents = event;
  }else{
    newEvents = [event];
  }

  const count = newEvents.reduce((a, e) => a + e.count, 1);
  cb(null, {count});
};
