import bluebird from 'bluebird';
import jwt from 'jsonwebtoken';

import { PermissionError } from '../errors';
import { isBanned as isUserBanned } from '../controllers/bans';

const verify = bluebird.promisify(jwt.verify);

function getHeaderToken(headers) {
  if (headers.authorization) {
    const parts = headers.authorization.split(' ');
    if (parts[0].toLowerCase() === 'jwt') {
      return parts[1];
    }
  }
  return null;
}

function getCookieToken(cookies) {
  return cookies.uwsession;
}

function getToken(req) {
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return getHeaderToken(req.headers) || getCookieToken(req.signedCookies);
}

export default function authenticatorMiddleware({ uw }, options) {
  async function authenticator(req) {
    const token = getToken(req);
    if (!token) {
      return;
    }

    let user;
    try {
      user = await verify(token, options.secret);
    } catch (e) {
      return;
    }

    if (!user) {
      return;
    }

    const User = uw.model('User');
    const userModel = await User.findById(user.id);
    if (!userModel) {
      return;
    }

    if (await isUserBanned(uw, userModel)) {
      throw new PermissionError('You have been banned');
    }

    req.user = userModel;
  }

  return (req, res, next) => {
    authenticator(req)
      .then(() => {
        next();
      })
      .catch((error) => {
        next(error);
      });
  };
}
