export default defineEventHandler(async (event) => {
  if (event.context.user) return null;

  const isOriginMismatch = checkOriginForMismatch(event);

  if (isOriginMismatch)
    throw createError({ statusCode: 403 });

  const body = await readBody(event) || {};

  if (body.email) body.email = body.email.trim();
  if (body.username) body.username = body.username.trim().replace(/\s/g, '_');
  if (body.password) body.password = body.password.trim();

  const validation = useRegisterValidation(body);

  if (!validation.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: `${validation.errors[0].dataPath.split('.').at(-1)} ${validation.errors[0].message}`,
    });
  }

  const prisma = getPrisma();

  const hashedPassword = await hashPassword(body.password)
    .catch(async (err) => {
      await event.context.logger.error({ err, msg: 'password hashing failed' });
    });

  if (!hashedPassword)
    throw createError({ statusCode: 500 });

  const user = await prisma.user.create({
    data: {
      email: body.email,
      username: body.username,
      password: hashedPassword,
      folders: {
        create: {
          name: `${body.username}'s workspace`,
          root: true,
          path: generateRootFolderPath(body.username),
        },
      },
    },

    select: { id: true, email: true, username: true },
  }).catch(async (err) => {
    await event.context.logger.error({ err, msg: 'user.create failed' });
  });

  if (!user)
    throw createError({ statusCode: 400, statusMessage: 'user with this email or username might already exist' });

  await setAuthCookies(event, user);

  if (typeof body.browserAction !== 'undefined')
    return sendRedirect(event, `/@${user.username}`);

  setResponseStatus(event, 201);

  return { data: user };
});
