import debug from 'debug';
import request from 'request';
import * as bcrypt from 'bcrypt';
import Promise from 'bluebird';
import { sign as jwtSignCallback } from 'jsonwebtoken';
import randomString from 'random-string';

import {
  HTTPError,
  NotFoundError,
  PasswordError,
  PermissionError,
  TokenError,
} from '../errors';
import {
  ROLE_MANAGER,
} from '../roles';
import beautifyDuplicateKeyError from '../utils/beautifyDuplicateKeyError';
import toItemResponse from '../utils/toItemResponse';
import { isBanned as isUserBanned } from './bans';

const log = debug('uwave:api:v1:auth');

const bcryptHash = Promise.promisify(bcrypt.hash);
const bcryptCompare = Promise.promisify(bcrypt.compare);
// `jwt.sign` only passes a single parameter to its callback: the signed token.
const jwtSign = (...args) => new Promise((resolve) => {
  jwtSignCallback(...args, resolve);
});

function verifyCaptcha(responseString, options) {
  if (!options.recaptcha) {
    log('ReCaptcha validation is disabled');
    return Promise.resolve();
  } else if (!responseString) {
    throw new Error('ReCaptcha validation failed. Please try again.');
  }

  return new Promise((resolve, reject) => {
    request.post('https://www.google.com/recaptcha/api/siteverify', {
      json: true,
      form: {
        response: responseString,
        secret: options.recaptcha.secret,
      },
    }, (err, resp) => {
      if (!err && resp.body.success) {
        resolve(resp.body);
      } else {
        log('recaptcha validation failure', resp.body);
        reject(new Error('ReCaptcha validation failed. Please try again.'));
      }
    });
  });
}

export function getCurrentUser(req) {
  return toItemResponse(req.user || {}, {
    url: req.fullUrl,
  });
}

export async function login(req) {
  const Authentication = req.uwave.model('Authentication');
  const { email, password } = req.body;
  const options = req.uwaveApiV1.options;

  const auth = await Authentication.findOne({ email }).populate('user').exec();
  if (!auth) {
    throw new NotFoundError('No user was found with that email address.');
  }

  const correct = await bcryptCompare(password, auth.hash);
  if (!correct) {
    throw new PasswordError('password is incorrect');
  }

  if (await isUserBanned(req.uwave, auth.user)) {
    throw new PermissionError('You have been banned');
  }

  const token = await jwtSign(
    { id: auth.user.id },
    options.secret,
    { expiresIn: '31d' }
  );

  return toItemResponse(auth.user, {
    meta: { jwt: token },
  });
}

export async function register(req, res, options) {
  const {
    grecaptcha,
    email,
    username,
    password,
  } = req.body;

  if (/\s|%20/.test(username)) {
    throw new HTTPError(400, 'Usernames can\'t contain spaces.');
  }

  await verifyCaptcha(grecaptcha, options);
  try {
    const user = await req.uwave.createUser({
      email,
      username,
      password,
    });
    return toItemResponse(user);
  } catch (error) {
    throw beautifyDuplicateKeyError(error);
  }
}

export async function reset(req) {
  const uw = req.uwave;
  const Authentication = uw.model('Authentication');

  const { email } = req.body;

  const auth = await Authentication.findOne({ email });
  if (!auth) {
    throw new NotFoundError('User not found.');
  }

  const token = randomString({ length: 35, special: false });

  await uw.redis.set(`reset:${email}`, token);
  await uw.redis.expire(`reset:${email}`, 24 * 60 * 60);

  return toItemResponse({
    token,
  });
}

export async function changePassword(req) {
  const uw = req.uwave;
  const Authentication = uw.model('Authentication');

  const { email, password, resetToken } = req.body;

  const token = await uw.redis.get(`reset:${email}`);
  if (!token || token !== resetToken) {
    throw new TokenError(
      'That reset token is invalid. Please double-check your token or request ' +
      'a new password reset.'
    );
  }

  const hash = await bcryptHash(password, 10);

  const auth = await Authentication.findOneAndUpdate({ email }, { hash });

  if (!auth) {
    throw new NotFoundError('No user was found with that email address.');
  }

  await uw.redis.del(`reset:${email}`);

  return toItemResponse({}, {
    meta: { message: `updated password for ${email}` },
  });
}

export async function removeSession(req) {
  if (req.user.id !== req.params.id && req.user.role < ROLE_MANAGER) {
    throw new PermissionError('You need to be a manager to do this');
  }

  const uw = req.uwave;
  const Authentication = uw.model('Authentication');
  const auth = await Authentication.findById(req.params.id);
  if (!auth) throw new NotFoundError('Session not found.');

  uw.publish('api-v1:socket:close', auth.id);

  return toItemResponse({}, {
    meta: { message: 'logged out' },
  });
}
