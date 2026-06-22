const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockGet(payload, delay = 180) {
  await wait(delay);
  return structuredClone(payload);
}
