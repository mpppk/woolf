import { mergeByPropAndIndices, mergeByResultPath, parseIndexSignature } from '../src/jobutil';

describe('mergeByPropAndIndices', () => {
  it('add result by prop and index', async () => {
    const result = mergeByPropAndIndices({a: 1}, {c: 2}, 'b', [0]);
    expect(result).toEqual({a:1, b: [{c: 2}]});
  });

  it('overwrite by result by prop and index', async () => {
    const result = mergeByPropAndIndices({a: 1}, {c: 2}, 'a', [0]);
    expect(result).toEqual({a: [{c: 2}]});
  });

  it('add result by prop and indices', async () => {
    const result = mergeByPropAndIndices({a: 1}, {c: 2}, 'b', [0, 0]);
    expect(result).toEqual({a:1, b: [[{c: 2}]]});
  });

  it('overwrite result by prop and indices', async () => {
    const result = mergeByPropAndIndices({a: 1, b: [[0, 1]]}, {c: 2}, 'b', [0, 1]);
    expect(result).toEqual({a:1, b: [[0, {c: 2}]]});
  });

  it('throw error if ', async () => {
    expect(() => mergeByPropAndIndices({a: 1}, {c: 2}, 'a', [1])).toThrow();
  });
});

describe('parseIndexSignature', () => {
  it('can parse path string', async () => {
    const [prop, indices] = parseIndexSignature('a[0]');
    expect(prop).toBe('a');
    expect(indices).toEqual([0]);
  });

  it('can parse 2dim array', async () => {
    const [prop, indices] = parseIndexSignature('a[0][1]');
    expect(prop).toBe('a');
    expect(indices).toEqual([0, 1]);
  });

  it('throw error if given invalid path', async () => {
    expect(() => parseIndexSignature('a[0')).toThrow();
  });

  it('throw error if given invalid index', async () => {
    expect(() => parseIndexSignature('a[-1]')).toThrow();
    expect(() => parseIndexSignature('a[b]')).toThrow();
  });
});

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

  // it('add to array', async () => {
  //   const result = mergeByResultPath({a:1, b: []}, {a:2}, '$.b[0]');
  //   expect(result).toEqual({a:1, b: {a:2}});
  // });

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
});
