import { parseEwkbPoint } from '../../../../../src/features/cities/data/ewkb';
import { DataError } from '../../../../../src/lib/errors';

/** Little-endian EWKB point, SRID 4326, lon -60.6505 / lat -32.9442 (Rosario). */
const EWKB_POINT_WITH_SRID = '0101000020E61000002506819543534EC00D71AC8BDB7840C0';
/** Same point as plain WKB (no SRID flag). */
const WKB_POINT_NO_SRID = '01010000002506819543534EC00D71AC8BDB7840C0';

describe('parseEwkbPoint', () => {
  it('decodes an EWKB point with SRID', () => {
    expect(parseEwkbPoint(EWKB_POINT_WITH_SRID)).toEqual({
      longitude: -60.6505,
      latitude: -32.9442,
    });
  });

  it('decodes a WKB point without SRID', () => {
    expect(parseEwkbPoint(WKB_POINT_NO_SRID)).toEqual({
      longitude: -60.6505,
      latitude: -32.9442,
    });
  });

  it.each([
    ['empty string', ''],
    ['odd hex length', '010'],
    ['non-hex characters', 'zz01000020'],
    ['truncated header', '0101'],
    ['truncated coordinate payload', EWKB_POINT_WITH_SRID.slice(0, 30)],
    ['non-point geometry (linestring)', '010200000000000000'],
  ])('throws DataError on %s', (_label, malformedHex) => {
    expect(() => parseEwkbPoint(malformedHex)).toThrow(DataError);
  });
});
