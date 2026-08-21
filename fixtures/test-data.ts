// ponytail: one file for static test data — add factories when you have >3 call sites
export const testUsers = {
  default: { email: 'e2e@sahiixx.dev', password: 'testpass123', name: 'E2E Test User' },
  api: { email: 'api-e2e@sahiixx.dev', password: 'test123' },
  dup: { email: 'dup-e2e@sahiixx.dev', password: 'test123' },
};

export const testListings = {
  minimal: { title: 'Test Listing', price_raw: '1,000,000 AED' },
};
