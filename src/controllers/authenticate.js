import * as bcrypt from 'bcryptjs';
import * as cookie from 'cookie';
import Promise from 'bluebird';
import ms from 'ms';
import { sign as jwtSignCallback } from 'jsonwebtoken';
import randomString from 'random-string';

import toItemResponse from '../utils/toItemResponse';
import {
  NotFoundError,
  PasswordError,
  PermissionError,
  TokenError,
} from '../errors';
import { isBanned as isUserBanned } from './bans';

const jwtSign = Promise.promisify(jwtSignCallback);

function seconds(str) {
  return Math.floor(ms(str) / 1000);
}

export function getCurrentUser(uw, id) {
  const User = uw.model('User');

  return User.findById(id);
}

export async function refreshSession(res, v1, user, options) {
  const token = await jwtSign(
    { id: user.id },
    options.secret,
    { expiresIn: '31d' },
  );

  const socketToken = await v1.socket.createAuthToken(user);

  if (options.session === 'cookie') {
    const serialized = cookie.serialize('uwsession', token, {
      httpOnly: true,
      secure: !!options.cookieSecure,
      path: options.cookiePath || '/',
      maxAge: seconds('31 days'),
    });
    res.setHeader('Set-Cookie', serialized);
    return toItemResponse(user, {
      meta: { socketToken },
    });
  }

  return toItemResponse(user, {
    meta: { jwt: token, socketToken },
  });
}

export async function login(req, res, options) {
  const { email, password } = req.body;
  const Authentication = req.uwave.model('Authentication');

  const auth = await Authentication.findOne({
    email: email.toLowerCase(),
  }).populate('user').exec();
  if (!auth) {
    throw new NotFoundError('No user was found with that email address.');
  }

  const correct = await bcrypt.compare(password, auth.hash);
  if (!correct) {
    throw new PasswordError('That password is incorrect.');
  }

  if (await isUserBanned(req.uwave, auth.user)) {
    throw new PermissionError('You have been banned.');
  }

  return refreshSession(res, req.uwaveApiV1, auth.user, {
    ...options,
    session: req.query.session || 'token',
  });
}

export async function getSocketToken(req, res) {
  const v1 = req.uwaveApiV1;
  const socketToken = await v1.socket.createAuthToken(req.user);
  return toItemResponse({ socketToken }, {
    url: req.fullUrl,
  });
}

export async function reset(uw, email) {
  const Authentication = uw.model('Authentication');

  const auth = await Authentication.findOne({
    email: email.toLowerCase(),
  });
  if (!auth) {
    throw new NotFoundError('User not found.');
  }

  const token = randomString({ length: 35, special: false });

  await uw.redis.set(`reset:${email.toLowerCase()}`, token);
  await uw.redis.expire(`reset:${email.toLowerCase()}`, 24 * 60 * 60);

  return token;
}

export async function changePassword(uw, email, password, resetToken) {
  const Authentication = uw.model('Authentication');

  const token = await uw.redis.get(`reset:${email.toLowerCase()}`);
  if (!token || token !== resetToken) {
    throw new TokenError(
      'That reset token is invalid. Please double-check your token or request ' +
      'a new password reset.',
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const auth = await Authentication.findOneAndUpdate({ email: email.toLowerCase() }, { hash });

  if (!auth) {
    throw new NotFoundError('No user was found with that email address.');
  }

  await uw.redis.del(`reset:${email.toLowerCase()}`);
  return `updated password for ${email}`;
}

export function removeSession(uw, id) {
  const Authentication = uw.model('Authentication');
  return Authentication.findById(id).then((auth) => {
    if (!auth) throw new NotFoundError('Session not found.');

    uw.publish('api-v1:socket:close', auth.id);
  });
}
