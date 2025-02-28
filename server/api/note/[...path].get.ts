export default defineEventHandler(async (event) => {
  const user = event.context.user!;
  const timer = event.context.timer!;

  const path = getRouterParam(event, 'path');

  if (!path)
    throw createError({ statusCode: 400 });

  const notePath = generateNotePath(user.username, path);

  const prisma = getPrisma();
  const selectParams = getNoteSelectParamsFromEvent(event);

  timer.start('db');
  const note = await prisma.note.findFirst({
    where: { path: notePath, ownerId: user.id },
    select: selectParams,
  }).catch(async (err) => {
    await event.context.logger.error({ err, msg: 'note.findFirst failed' });
  });
  timer.end();

  if (!note) {
    throw createError({
      // prisma will return null if nothing found
      // thou, error catching will return undefined
      statusCode: note === null ? 404 : 400,
    });
  }

  timer.appendHeader(event);

  return { data: note };
});
