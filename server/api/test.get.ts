export default defineEventHandler(async () => {
  const storage = useStorage('cache');

  const nowGet = performance.now();
  const item = await storage.getItem('test:oauth');
  const diffGet = performance.now() - nowGet;

  return { item, diffGet };
});
