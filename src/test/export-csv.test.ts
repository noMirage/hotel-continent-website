import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { downloadCSV } = await import("@/lib/export-csv");

// jsdom doesn't implement URL.createObjectURL / revokeObjectURL.
// Install stubs once and restore after each test.
let capturedBlob: Blob | null = null;
let capturedBlobText = "";
let anchorEl: { click: ReturnType<typeof vi.fn>; href: string; download: string };

beforeEach(() => {
  capturedBlob = null;
  capturedBlobText = "";
  anchorEl = { click: vi.fn(), href: "", download: "" };

  URL.createObjectURL = vi.fn().mockReturnValue("blob:fake-url");
  URL.revokeObjectURL = vi.fn();

  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "a") return anchorEl as unknown as HTMLElement;
    return document.createElement.call(document, tag);
  });
  vi.spyOn(document.body, "appendChild").mockImplementation(() => anchorEl as any);

  // Capture the Blob that downloadCSV creates so we can read its content.
  const OriginalBlob = globalThis.Blob;
  vi.spyOn(globalThis, "Blob").mockImplementation((parts?: BlobPart[], opts?: BlobPropertyBag) => {
    capturedBlob = new OriginalBlob(parts, opts);
    return capturedBlob;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Remove the URL stubs
  delete (URL as any).createObjectURL;
  delete (URL as any).revokeObjectURL;
});

async function getBlobText(): Promise<string> {
  if (!capturedBlob) return "";
  return capturedBlob.text();
}

describe("downloadCSV", () => {
  it("empty array guard: returns immediately without creating a blob or anchor", async () => {
    downloadCSV([], "report");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(document.body.appendChild).not.toHaveBeenCalled();
    expect(anchorEl.click).not.toHaveBeenCalled();
  });

  it("header extraction: keys of first object become CSV header row", async () => {
    downloadCSV([{ name: "Alice", age: 30 }], "test");
    const text = await getBlobText();
    expect(text).toMatch(/^name,age\n/);
  });

  it("full output: 2 rows produce exact CSV string", async () => {
    downloadCSV([{ name: "Alice", score: 100 }, { name: "Bob", score: 42 }], "data");
    const text = await getBlobText();
    const expected = `name,score\n"Alice","100"\n"Bob","42"`;
    expect(text).toBe(expected);
  });

  it('quote escaping: a value containing " becomes ""', async () => {
    downloadCSV([{ note: 'say "hello"' }], "quotes");
    const text = await getBlobText();
    // str = 'say ""hello""' → wrapped: '"say ""hello"""'
    expect(text).toContain('"say ""hello"""');
  });

  it("comma in value: value is wrapped in quotes", async () => {
    downloadCSV([{ city: "New York, NY" }], "cities");
    const text = await getBlobText();
    expect(text).toContain('"New York, NY"');
  });

  it("newline in value: value is wrapped in quotes", async () => {
    downloadCSV([{ note: "line1\nline2" }], "notes");
    const text = await getBlobText();
    expect(text).toContain('"line1\nline2"');
  });

  it("sets filename as <name>.csv on the anchor element", () => {
    downloadCSV([{ x: 1 }], "my-report");
    expect(anchorEl.download).toBe("my-report.csv");
  });

  it("calls URL.createObjectURL and then revokeObjectURL, and clicks the anchor", () => {
    downloadCSV([{ x: 1 }], "file");
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    expect(anchorEl.click).toHaveBeenCalledOnce();
  });
});
