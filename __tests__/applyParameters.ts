import { applyParameters } from '../src/applyParameters';

describe('applyParameters', () => {
  it('merge original data and parameters', async () => {
    const result = applyParameters({a:1}, {b:2});
    expect(result).toEqual({a:1, b:2});
  });

  it('refer original data properties by json path', async () => {
    const result = applyParameters({a:1}, {'b.$':'$.a'});
    expect(result).toEqual({a:1, b:1});
  });

  it('throw error if there is no matching key in data', async () => {
    expect(() => applyParameters({a:1}, {'b.$':'$.c'})).toThrow('There is no matching property: \'b.$\': \'$.c\'');
  });
});
