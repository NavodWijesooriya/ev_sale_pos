// Test stand-in for lib/auth: the session is whatever the test sets on globalThis.__TEST_SESSION__.
export async function getAuthSession() {
  return globalThis.__TEST_SESSION__ ?? null
}
