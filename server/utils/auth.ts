import { randomUUID } from 'node:crypto';
import { getCookie, setCookie } from 'h3';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from '@node-rs/bcrypt';
import argon2 from '@node-rs/argon2';
import parseDuration from 'parse-duration';

import type { H3Event } from 'h3';

import { isJwtPayload } from './validators/jwt';
import { toBigInt } from '.';

import type { SafeUser } from '~/types/server';

const authExpiration = parseDuration('3 days', 'second')!;
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || '');
const jwtIssuer = process.env.JWT_ISSUER || 'test:keycap';
const accessTokenName = import.meta.prod ? '__Host-keycap-user' : 'keycap-user';

async function generateAccessToken(object: Record<string, any>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const { id, ...rest } = object;

  return await new SignJWT(rest)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(now + authExpiration)
    .setIssuer(jwtIssuer)
    .sign(jwtSecret);
}

function getArgon2Options(): argon2.Options {
  // https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#introduction
  return {
    timeCost: 2,
    memoryCost: 32768, // 32mb
  };
}

export async function setAuthCookies(event: H3Event, user: SafeUser) {
  const accessToken = await generateAccessToken(user);

  // https://web.dev/first-party-cookie-recipes/#the-good-first-party-cookie-recipe
  setCookie(event, accessTokenName, accessToken, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: import.meta.prod,
    maxAge: authExpiration,
  });
}

export async function removeAuthCookies(_event: H3Event) {
  // noop
}

export async function getUserFromEvent(event: H3Event): Promise<SafeUser | null> {
  const accessToken = getCookie(event, accessTokenName);

  if (!accessToken) return null;

  const { payload } = await jwtVerify(accessToken, jwtSecret, { issuer: jwtIssuer })
    .catch(async (err) => {
      await event.context.logger.error({ err, msg: 'jwt verification failed' });

      return {} as { payload: undefined };
    });

  if (isJwtPayload(payload)) {
    return {
      id: toBigInt(payload.sub),
      email: payload.email,
      username: payload.username,
    };
  }
  else {
    return null;
  }
}

export async function hashPassword(pass: string): Promise<string> {
  return await argon2.hash(pass, getArgon2Options());
}

export async function verifyPassword(hashedPass: string, pass: string): Promise<boolean> {
  if (hashedPass.startsWith('$argon2'))
    return await argon2.verify(hashedPass, pass, getArgon2Options());

  return await bcrypt.compare(pass, hashedPass);
}

export function checkOriginForMismatch(event: H3Event) {
  const reqUrl = getRequestURL(event);
  const origin = getHeader(event, 'origin');

  // https://github.com/sveltejs/kit/blob/21272ee81d915b1049c4ba1ab981427fac232e80/packages/kit/src/runtime/server/respond.js#L56
  return reqUrl.origin !== origin;
}
