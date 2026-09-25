import { describe, expect, it } from "vitest";
import { isInvalidApiKeyError, ImagenAuthError } from "../nanoBanana";

/**
 * Google reports a rejected key as `400 INVALID_ARGUMENT`, which reads like a
 * malformed request. Telling the two apart is what decides whether an operator
 * goes looking for a bug or just replaces the key.
 */
describe("isInvalidApiKeyError", () => {
  it("recognises the real rejection Google sends", () => {
    const real = new Error(
      '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}'
    );
    expect(isInvalidApiKeyError(real)).toBe(true);
  });

  it("recognises an expired key", () => {
    expect(isInvalidApiKeyError(new Error("API key expired. Renew it."))).toBe(
      true
    );
  });

  it("does not mistake other 400s for a credential problem", () => {
    expect(
      isInvalidApiKeyError(
        new Error('{"error":{"code":400,"message":"Invalid aspect ratio"}}')
      )
    ).toBe(false);
    expect(
      isInvalidApiKeyError(new Error("safety filter blocked output"))
    ).toBe(false);
    expect(isInvalidApiKeyError(undefined)).toBe(false);
  });
});

describe("ImagenAuthError", () => {
  it("says what is wrong, what it costs, and where to fix it", () => {
    const err = new ImagenAuthError(new Error("API_KEY_INVALID"));
    expect(err.message).toMatch(/GEMINI_API_KEY/);
    expect(err.message).toMatch(/\.env/);
    expect(err.message).toMatch(/placeholder/);
  });

  it("keeps the original error for the logs", () => {
    const cause = new Error("API_KEY_INVALID");
    expect(new ImagenAuthError(cause).cause).toBe(cause);
  });
});
