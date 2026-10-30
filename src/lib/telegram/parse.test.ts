import { describe, expect, it } from "vitest";
import { normalizeDigits, parseCommand, parseSize, parseToman } from "./parse";

describe("bot parsers", () => {
  it("normalizes Persian digits", () => {
    expect(normalizeDigits("۱۲۳٬۴۵۶")).toBe("123456");
  });
  it("parses sizes in cm and metres, either order", () => {
    expect(parseSize("۳۰۰ در ۲۰۰")).toEqual({ lengthCm: 300, widthCm: 200 });
    expect(parseSize("200x300")).toEqual({ lengthCm: 300, widthCm: 200 });
    expect(parseSize("3*2")).toEqual({ lengthCm: 300, widthCm: 200 });
    expect(parseSize("2.5 x 1.7")).toEqual({ lengthCm: 250, widthCm: 170 });
    expect(parseSize("big")).toBeNull();
  });
  it("parses toman amounts with Persian units", () => {
    expect(parseToman("۱۲۰ میلیون")).toBe(120_000_000);
    expect(parseToman("1.5 میلیارد تومان")).toBe(1_500_000_000);
    expect(parseToman("85,000,000")).toBe(85_000_000);
    expect(parseToman("abc")).toBeNull();
  });
  it("parses commands with arguments", () => {
    expect(parseCommand("/price ۲ ۹۰ میلیون")).toEqual({ cmd: "price", args: ["2", "90", "میلیون"] });
    expect(parseCommand("/start@IranCarpetBot")).toEqual({ cmd: "start", args: [] });
  });
});
