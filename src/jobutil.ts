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
      return mergeByPropAndIndices(cData, [], prop, indices);
      return indices.reduce(((d, i) => d[i]), cData[prop]);
    }

    if (!cData.hasOwnProperty(path)) {
      cData[path] = {};
    }
    return cData[path];
  }, newData);
  resultTarget[lastPath] = result;
  return newData;
};

export const mergeByPropAndIndices = (data: any, result: any, prop: string, indices: number[]) => {
  const newData = {...data};
  if (indices.length <= 0) {
    throw new Error('empty indices');
  }

  if (!prop) {
    throw new Error('empty prop');
  }

  if (!newData.hasOwnProperty(prop) || !Array.isArray(newData[prop])) {
    newData[prop] = [];
  }

  const newIndices = [...indices];
  const lastIndex = newIndices.pop() as number;

  const getNextArray = (d: any, i: number) => {
    if (i === 0 && d.length <= 0) {
      d.push([]);
      return d[0];
    }

    if (!Array.isArray(d) || d.length <= i) {
      throw new Error(`invalid index: ${i} of ${newIndices}`);
    }
    if (!Array.isArray(d[i])) {
      d[i] = [];
    }
    return d[i];
  };

  const targetArray = newIndices.reduce(getNextArray, newData[prop]);

  if (lastIndex === 0) {
    if (targetArray.length > 0) {
      targetArray[lastIndex] = result;
      return newData;
    }
    targetArray.push(result);
    return newData;
  }

  if (!Array.isArray(targetArray) || targetArray.length <= lastIndex) {
    throw new Error(`invalid index: ${lastIndex} of ${indices}: targetArray: ${targetArray}`);
  }

  targetArray[lastIndex] = result;
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
