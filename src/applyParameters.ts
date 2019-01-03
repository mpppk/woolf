import * as jp from 'jsonpath';
import { IWoolfData } from './models';

export const applyParameters = (data: any, parameters: IWoolfData): any => {
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
  return {...data, ...newParameters};
};

