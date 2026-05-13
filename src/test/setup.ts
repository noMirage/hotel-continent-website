import "@testing-library/jest-dom";
import { beforeEach, afterEach } from "vitest";

// jsdom replaces globalThis.AbortController/AbortSignal with its own webidl
// implementation. MSW's @mswjs/interceptors captures the ORIGINAL Node-native
// Request constructor at module-load time (before jsdom runs). When Node's
// native Request receives a signal it validates it with:
//   signal instanceof <Node-native-AbortSignal>
// jsdom's AbortSignal is a different class → TypeError on every supabase fetch.
//
// Fix: in beforeEach (after each test file's beforeAll calls server.listen())
// wrap globalThis.fetch to strip the signal from RequestInit before the init
// reaches MSW / the native Request constructor. MSW handles signal-less
// requests identically for our mock handlers; none of the tests exercise abort.
let _preFetchOverride: typeof globalThis.fetch | null = null;

beforeEach(() => {
  const baseFetch = globalThis.fetch;
  _preFetchOverride = baseFetch;
  globalThis.fetch = function stripSignal(
    input: Parameters<typeof fetch>[0],
    init?: RequestInit,
  ) {
    if (init && "signal" in init) {
      const { signal: _s, ...rest } = init;
      return baseFetch(input, rest);
    }
    return baseFetch(input, init);
  };
});

afterEach(() => {
  if (_preFetchOverride !== null) {
    globalThis.fetch = _preFetchOverride;
    _preFetchOverride = null;
  }
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
