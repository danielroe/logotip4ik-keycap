export default defineEventHandler(async (event) => {
  const user = event.context.user!;
  const timer = event.context.timer!;

  const prisma = getPrisma();

  const path = getRouterParam(event, 'path');

  if (!path)
    throw createError({ statusCode: 400 });

  const folderPath = generateFolderPath(user.username, path);

  if (generateRootFolderPath(user.username) === folderPath)
    return {};

  timer.start('db');
  const folder = await prisma.folder.delete({
    where: { path: folderPath },
    select: { id: true },
  }).catch((err) => {
    event.context.logger.log('error', 'folder.delete failed', err, { path: event.path });
  });
  timer.end();

  if (!folder)
    throw createError({ statusCode: 400 });

  timer.appendHeader(event);

  setResponseStatus(event, 204);

  return { ok: true };
});
