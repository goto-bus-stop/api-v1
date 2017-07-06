import escapeStringRegExp from 'escape-string-regexp';
// eslint-disable-next-line
import Page from 'u-wave-core/lib/Page';

import { HTTPError, NotFoundError } from '../errors';
import getOffsetPagination from '../utils/getOffsetPagination';
import toItemResponse from '../utils/toItemResponse';
import toPaginatedResponse from '../utils/toPaginatedResponse';

function isValidBan(user) {
  return !!(user.banned && user.banned.expiresAt > Date.now());
}

export async function isBanned(uw, user) {
  const User = uw.model('User');

  if (user instanceof User && 'banned' in user) {
    return isValidBan(user);
  }

  const userID = typeof user === 'object' ? user._id : user;
  const userModel = await User.findById(userID, { banned: true });

  return isValidBan(userModel);
}

export async function getBans(req) {
  const uw = req.uwave;
  const { filter } = req.query;
  const pagination = getOffsetPagination(req.query, {
    defaultSize: 50,
  });
  const User = uw.model('User');

  const query = User.find()
    .where({
      banned: { $ne: null },
      'banned.expiresAt': { $gt: Date.now() },
    })
    .skip(pagination.offset)
    .limit(pagination.limit)
    .populate('banned.moderator')
    .lean();

  if (filter) {
    query.where('username').regex(RegExp(escapeStringRegExp(filter), 'i'));
  }

  const bannedUsers = await query.exec();
  const count = await query.count();
  const bans = new Page(bannedUsers.map((user) => {
    // hee hee!
    const ban = user.banned;
    delete user.banned;
    ban.user = user;
    return ban;
  }), {
    pageSize: pagination ? pagination.limit : null,
    filtered: count,
    total: count,

    current: pagination,
    next: pagination ? {
      offset: pagination.offset + pagination.limit,
      limit: pagination.limit,
    } : null,
    previous: pagination ? {
      offset: Math.max(pagination.offset - pagination.limit, 0),
      limit: pagination.limit,
    } : null,
  });

  return toPaginatedResponse(bans, {
    baseUrl: req.fullUrl,
    included: {
      user: ['user', 'moderator'],
    },
  });
}

export async function addBan(req) {
  const uw = req.uwave;
  const moderatorID = req.user.id;
  const {
    duration = 0,
    userID,
    permanent = false,
  } = req.body;

  const userModel = await uw.getUser(userID);

  if (!userModel) {
    throw new NotFoundError('User not found.');
  }
  if (duration <= 0 && !permanent) {
    throw new HTTPError(400, 'Ban duration should be at least 0ms.');
  }

  userModel.banned = {
    duration: permanent ? -1 : duration,
    expiresAt: permanent ? 0 : Date.now() + duration,
    moderator: moderatorID,
    reason: '',
  };

  await userModel.save();
  await userModel.populate('banned.moderator').execPopulate();

  uw.publish('user:ban', {
    userID: userModel.id,
    moderatorID: userModel.banned.moderator.id,
    duration: userModel.banned.duration,
    expiresAt: userModel.banned.expiresAt,
    permanent,
  });

  return toItemResponse(userModel.banned);
}

export async function removeBan(req) {
  const uw = req.uwave;
  const moderatorID = req.user.id;
  const { userID } = req.params;

  const userModel = await uw.getUser(userID);

  if (!userModel) {
    throw new NotFoundError('User not found.');
  }
  if (!userModel.banned) {
    throw new NotFoundError(`User "${userModel.username}" is not banned.`);
  }

  delete userModel.banned;

  await userModel.save();

  uw.publish('user:unban', {
    userID: `${userModel.id}`,
    moderatorID,
  });

  return toItemResponse({});
}
