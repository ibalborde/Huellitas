import { DataError } from '@/lib/errors';
import type { Coordinates } from '@/lib/geo';

/**
 * Minimal EWKB point decoder.
 *
 * PostgREST serializes PostGIS `geography` columns as hex-encoded EWKB.
 * Layout of a 2D point:
 *   byte 0        — byte order (1 = little-endian, 0 = big-endian)
 *   bytes 1-4     — geometry type uint32; bit 0x20000000 set when an SRID
 *                   uint32 follows the type
 *   [bytes 5-8]   — SRID (when flagged)
 *   next 8 bytes  — X (longitude) float64
 *   next 8 bytes  — Y (latitude) float64
 *
 * Only points are supported on purpose: that is the only geography shape the
 * client reads (`cities.center`). Anything else is a data error.
 */

const WKB_GEOMETRY_TYPE_POINT = 1;
const EWKB_SRID_FLAG = 0x20000000;
/** Lower bits of the type field identify the geometry shape. */
const WKB_GEOMETRY_TYPE_MASK = 0xffff;

const BYTE_ORDER_BYTES = 1;
const GEOMETRY_TYPE_BYTES = 4;
const SRID_BYTES = 4;
const COORDINATE_BYTES = 8;

const PARSE_ERROR_USER_MESSAGE = 'No pudimos interpretar una ubicación recibida del servidor.';

function malformed(detail: string, ewkbHex: string): DataError {
  return new DataError(`Malformed EWKB point "${ewkbHex}": ${detail}`, PARSE_ERROR_USER_MESSAGE);
}

const HEX_PATTERN = /^[0-9a-fA-F]+$/;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Decodes a hex EWKB/WKB point into coordinates. Throws DataError otherwise. */
export function parseEwkbPoint(ewkbHex: string): Coordinates {
  if (ewkbHex.length === 0 || ewkbHex.length % 2 !== 0) {
    throw malformed('odd or empty hex length', ewkbHex);
  }
  if (!HEX_PATTERN.test(ewkbHex)) {
    throw malformed('not a hex string', ewkbHex);
  }

  const bytes = hexToBytes(ewkbHex);
  if (bytes.length < BYTE_ORDER_BYTES + GEOMETRY_TYPE_BYTES) {
    throw malformed('truncated header', ewkbHex);
  }
  const view = new DataView(bytes.buffer);

  const littleEndian = view.getUint8(0) === 1;
  const rawType = view.getUint32(BYTE_ORDER_BYTES, littleEndian);
  if ((rawType & WKB_GEOMETRY_TYPE_MASK) !== WKB_GEOMETRY_TYPE_POINT) {
    throw malformed(`geometry type ${rawType & WKB_GEOMETRY_TYPE_MASK} is not a point`, ewkbHex);
  }

  const hasSrid = (rawType & EWKB_SRID_FLAG) !== 0;
  const coordinatesOffset = BYTE_ORDER_BYTES + GEOMETRY_TYPE_BYTES + (hasSrid ? SRID_BYTES : 0);
  if (bytes.length < coordinatesOffset + 2 * COORDINATE_BYTES) {
    throw malformed('truncated coordinate payload', ewkbHex);
  }

  return {
    longitude: view.getFloat64(coordinatesOffset, littleEndian),
    latitude: view.getFloat64(coordinatesOffset + COORDINATE_BYTES, littleEndian),
  };
}
