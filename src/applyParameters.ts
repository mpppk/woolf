// @ts-ignore
import jp = require('jsonpath/jsonpath.min');
import { IWoolfData } from './models';

export const applyParameters = (data: any, parameters: IWoolfData): any => {
  if (Object.keys(parameters).length <= 0) {
    return data;
  }

  const newParameters = {...parameters};
  const targetKeys = Object.keys(newParameters).filter(key => key.match(/.+\.\$/));
  targetKeys.forEach((key) => {
    const newKey = key.replace(/\.\$/g, '');
    const queryResults = jp.query(data, newParameters[key]);
    if (queryResults.length <= 0) {
      throw new Error(`There is no matching property: '${key}': '${newParameters[key]}'`);
    }

    if (queryResults.length > 1) {
      throw new Error('There are multiple properties matching key: ' + queryResults);
    }

    newParameters[newKey] = queryResults[0];
    delete newParameters[key];
  });
  if (Array.isArray(data)) {
    return newParameters;
  }
  return {...data, ...newParameters};
};

