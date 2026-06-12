import { roundCoordinates, roundTo } from '../../../src/lib/geo';

describe('roundTo', () => {
  it('rounds to the requested number of decimals', () => {
    expect(roundTo(-32.94428117, 3)).toBe(-32.944);
    expect(roundTo(-60.65049999, 3)).toBe(-60.65);
    expect(roundTo(1.0005, 3)).toBe(1.001);
  });

  it('leaves already-rounded values untouched', () => {
    expect(roundTo(-32.944, 3)).toBe(-32.944);
    expect(roundTo(0, 3)).toBe(0);
  });
});

describe('roundCoordinates', () => {
  it('rounds both axes with the same precision', () => {
    expect(roundCoordinates({ latitude: -32.94428117, longitude: -60.65051234 }, 3)).toEqual({
      latitude: -32.944,
      longitude: -60.651,
    });
  });

  it('collapses GPS jitter onto the same coordinates', () => {
    const fixA = roundCoordinates({ latitude: -32.9441001, longitude: -60.6503998 }, 3);
    const fixB = roundCoordinates({ latitude: -32.9440997, longitude: -60.6504002 }, 3);
    expect(fixA).toEqual(fixB);
  });
});
