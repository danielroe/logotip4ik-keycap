export const stringifiedBigIntRE = /(\d{18})n/;
export const allowedClientItemNameRE = /^[\w .&#!\|\-\u0404-\u0457]{2,50}\/?$/; // eslint-disable-line regexp/no-useless-escape
// NOTE: do not forget to change same RE in nitro side

export function toBigInt(string: string): bigint {
  const match = string.match(stringifiedBigIntRE);

  if (match)
    return BigInt(match[1]);

  try {
    return BigInt(string);
  }
  catch {
    return BigInt(-1);
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('toBigInt', () => {
    expect(toBigInt('77777777777777777n')).to.equal(BigInt(-1));
    expect(toBigInt('777777777777777777n')).to.not.equal(BigInt(-1));
  });
}
