import { applyParameters } from '../src/applyParameters';

describe('applyParameters', () => {
  it('merge original data and parameters', async () => {
    const result = applyParameters({ a: 1 }, { b: 2 });
    expect(result).toEqual({ b: 2 });
  });

  it('refer original data properties by json path', async () => {
    const result = applyParameters({ a: 1 }, { 'b.$': '$.a' });
    expect(result).toEqual({ b: 1 });
  });

  it('does not affect to original data if empty object is given', async () => {
    const result = applyParameters({ a: 1, b: 2 }, {});
    expect(result).toEqual({ a: 1, b: 2 });
    const result2 = applyParameters([1, 2], {});
    expect(result2).toEqual([1, 2]);
  });

  it('overwrite original data if data is array', async () => {
    const result = applyParameters([1], { a: 1 });
    expect(result).toEqual({ a: 1 });

    const result2 = applyParameters([1], { 'a.$': '$' });
    expect(result2).toEqual({ a: [1] });
  });

  it('throw error if there is no matching key in data', async () => {
    expect(() => applyParameters({ a: 1 }, { 'b.$': '$.c' })).toThrow("There is no matching property: 'b.$': '$.c'");
  });
});
