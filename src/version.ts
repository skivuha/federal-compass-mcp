/**
 * The version reported to MCP clients during the initialize handshake.
 *
 * This was a bare literal in src/index.ts that release-please was never told
 * about — no marker, no config entry — so it reported 0.1.0, a version that was
 * never even published, across all nine releases from 0.1.1 to 0.1.9.
 *
 * It is now bumped by release-please via the `extra-files` entry in
 * release-please-config.json. Two things have to stay true, and neither fails
 * loudly if broken:
 *
 *   1. that config entry must still point at this file — a wrong path only
 *      produces a buried warning in the Actions log;
 *   2. the marker comment must stay on the SAME line as the literal, because
 *      release-please matches line by line, so a marker one line up rewrites
 *      nothing and logs nothing.
 *
 * tests/version.test.ts guards the value and both of those conditions.
 */
export const SERVER_VERSION = '0.1.10'; // x-release-please-version
