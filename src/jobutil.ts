import * as jp from 'jsonpath';
import { IWoolfData } from './models';

export const mergeByResultPath = (data: IWoolfData, result: IWoolfData, resultPath: string): IWoolfData => {
  try {
    jp.query(data, resultPath);
  } catch (e) {
    throw new Error(`failed to parse ResultPath: ${resultPath}`);
  }

  if (resultPath.includes('[')) {
    throw new Error('currently [] syntax is not supported in ResultPath: ' + resultPath);
  }
  const parsedResultPath = resultPath.split('.');
  const firstPath = parsedResultPath.shift();
  if (!firstPath) {
    throw new Error('ResultPath is empty: ' + resultPath);
  }

  if (firstPath !== '$') {
    throw new Error('ResultPath must be start by $, actual: ' + resultPath);
  }

  const newData: IWoolfData = {...data};
  const lastPath = parsedResultPath.pop();
  if (!lastPath) {
    return result;
  }
  const resultTarget = parsedResultPath.reduce((d, path) => {
    if (!d.hasOwnProperty(path)) {
      d[path] = {};
    }
    return d[path];
  }, newData);
  resultTarget[lastPath] = result;
  return newData;
};
