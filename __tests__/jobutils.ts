import { mergeByResultPath } from '../src/jobutil';

describe('mergeByResultPath', () => {
  it('replace data if ResultPath is $', async () => {
    const result = mergeByResultPath({a:1}, {a:2}, '$');
    expect(result).toEqual({a:2});
  });

  it('add new property', async () => {
    const result = mergeByResultPath({a:1}, {a:2}, '$.b');
    expect(result).toEqual({a:1, b: {a:2}});
  });

  it('add nested property', async () => {
    const result = mergeByResultPath({a:1}, {a:2}, '$.b.c');
    expect(result).toEqual({a:1, b: {c: {a:2}}});
  });

  it('update exist property', async () => {
    const result = mergeByResultPath({a:1, b:1}, {a:2}, '$.b');
    expect(result).toEqual({a:1, b: {a:2}});
  });

  it('throw error if ResultPath is empty', async () => {
    expect(() => mergeByResultPath({a:1}, {a:2}, '')).toThrow('failed to parse ResultPath: ');
  });

  it('throw error if ResultPath does not start by $', async () => {
    expect(() => mergeByResultPath({a:1}, {a:2}, 'a')).toThrow('ResultPath must be start by $, actual: a');
  });

  it('throw error if ResultPath includes index signature', async () => {
    expect(() => mergeByResultPath({a:1}, {a:2}, '$.a[0]')).toThrow('currently [] syntax is not supported in ResultPath: $.a[0]');
  });
});
