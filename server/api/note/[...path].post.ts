import { getPrisma } from '~/prisma';

export default defineEventHandler(async (event) => {
  const user = event.context.user!;
  const timer = event.context.timer!;

  const prisma = getPrisma();

  const body = await readBody<{ parentId?: string }>(event) || {};
  const path = getRouterParam(event, 'path') as string;
  const notePath = generateNotePath(user.username, path);
  const noteName = decodeURIComponent(notePath.split('/').at(-1)!).trim();

  if (!body.parentId || !path || noteName.length < 2)
    return createError({ statusCode: 400 });

  const selectParams = getNoteSelectParamsFromEvent(event);

  timer.start('db');
  const note = await prisma.note.create({
    data: {
      // last route param always should be note name
      name: noteName,
      content: '',
      path: notePath,
      owner: { connect: { id: user.id } },
      parent: { connect: { id: toBigInt(body.parentId) } },
    },
    select: { ...selectParams },
  }).catch((err) => {
    event.context.logger.error(err, 'note.create failed');
  });
  timer.end();

  if (!note)
    return createError({ statusCode: 400 });

  timer.appendHeader(event);

  return note;
});
