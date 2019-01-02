import * as jp from 'jsonpath';
import { IWoolfData } from './models';

export const mergeByResultPath = (data: IWoolfData, result: IWoolfData, resultPath: string): IWoolfData => {
  try {
    jp.query(data, resultPath);
  } catch (e) {
    throw new Error(`failed to parse ResultPath: ${resultPath}`);
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
  const resultTarget = parsedResultPath.reduce((cData, path) => {
    if (path.includes('[')) {
      const [prop, indices] = parseIndexSignature(path);
      return mergeByKeys(cData, [], [prop, ...indices]);
    }

    if (!cData.hasOwnProperty(path)) {
      cData[path] = {};
    }
    return cData[path];
  }, newData);
  resultTarget[lastPath] = result;
  return newData;
};

export const mergeByKeys = (data: any, result: any, keys: Array<string | number>) => {
  const newData = {...data};
  if (keys.length <= 0) {
    throw new Error('empty indices');
  }

  const newKeys = [...keys];
  const lastKey = newKeys.pop() as string | number;
  const getEmptyValueFunc = typeof lastKey === 'string' ?
    newEmptyObjectOrArrayFunc('object') :
    newEmptyObjectOrArrayFunc('array');

  const targetData = getNestedPath(newData, newKeys, getEmptyValueFunc);

  if (typeof lastKey === 'string') {
    targetData[lastKey] = result;
    return newData;
  }

  if (targetData.length === 0 && lastKey === 0) {
    targetData.push(result);
    return newData;
  }

  if (targetData.length <= lastKey) {
    throw new Error('invalid path: ' + keys);
  }
  targetData[lastKey] = result;
  return newData;
};

export const parseIndexSignature = (path: string): [string, number[]] => {
  const [prop, ...others] = path.split('[');
  if (others.some(o => !o.includes(']'))) {
    throw new Error('invalid path: ' + path);
  }
  const indices = others
    .map(o => o.replace(']', ''))
    .map(n => parseInt(n, 10));

  if (indices.some(n => Number.isNaN(n)) ||
      indices.some(n => n < 0)) {
    throw new Error('invalid index: ' + path);
  }
  return [prop, indices];
};

export const getNestedPath = (data: any, paths: Array<number | string>, newEmptyValueFunc: () => any): any => {
  for (let i = 0; i < paths.length - 1; i++) {
    const path = paths[i];
    const nextKey = paths[i+1];
    const newValueFunc = Number.isInteger(nextKey as number) ?
      newEmptyObjectOrArrayFunc('array') :
      newEmptyObjectOrArrayFunc('object');
    data = getNextPath(data, path, newValueFunc);
  }
  const lastPath = paths[paths.length - 1];

  switch (typeof lastPath) {
    case 'string':
      data[lastPath] = newEmptyValueFunc();
      return data[lastPath];
    case 'number':
      if (data.length === 0 && lastPath === 0) {
        data.push(newEmptyValueFunc());
        return data[0];
      }

      if (data.length <= lastPath) {
        throw new Error('invalid path: ' + paths);
      }
      return data[lastPath];
  }
};

export const getNextPath = (d: any, path: number | string,
                            newEmptyValueFunc: () => any = newEmptyObjectOrArrayFunc('object')) => {
  if (typeof path === 'number') {
    if (Number.isInteger(path)) {
      return getNextArray(d, path, newEmptyValueFunc);
    }
    throw new Error('invalid path: ' + path);
  }
  return getNextValue(d, path, newEmptyValueFunc);
};

const getNextArray = (d: any[], i: number, newEmptyValueFunc: () => any): any => {
  if (!Array.isArray(d)) {
    throw new Error('invalid data: ' + d);
  }
  if (i === 0 && d.length <= 0) {
    d.push(newEmptyValueFunc());
    return d[0];
  }

  if (d.length <= i) {
    throw new Error(`invalid index: ${i}`);
  }
  if (!(d[i] instanceof Object)) {
    d[i] = newEmptyValueFunc();
  }
  return d[i];
};

const getNextValue = (data: any, path: string, newEmptyValueFunc: () => any): any => {
  if (!data.hasOwnProperty(path) || !(data[path] instanceof Object)) {
    data[path] = newEmptyValueFunc();
  }
  return data[path];
};

const newEmptyObjectOrArrayFunc = (type: 'object' | 'array') => {
  return () => (type === 'object' ? {} : []);
};

export const parseReferencePath = (path: string): Array<number | string> => {
  const paths = path.split('.');
  const firstPath = paths.shift();
  if (!firstPath) {
    throw new Error('ResultPath is empty: ' + path);
  }

  if (firstPath !== '$') {
    throw new Error('ResultPath must be start by $, actual: ' + path);
  }

  return _.flatMap(paths, (p: string) => {
    if (path.includes('[')) {
      const [prop, indices] = parseIndexSignature(p);
      return [prop, ...indices];
    }
    return p;
  });
};
