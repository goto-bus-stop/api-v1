import clamp from 'clamp';

import { createCommand } from '../sockets';

import {
  PermissionError,
} from '../errors';
import {
  ROLE_MANAGER,
  ROLE_ADMIN,
} from '../roles';
import {
  skipIfCurrentDJ,
  getHistory as getHistoryBase,
} from './booth';
import { leaveWaitlist } from './waitlist';
import beautifyDuplicateKeyError from '../utils/beautifyDuplicateKeyError';
import getOffsetPagination from '../utils/getOffsetPagination';
import toItemResponse from '../utils/toItemResponse';
import toPaginatedResponse from '../utils/toPaginatedResponse';

export async function getUsers(req) {
  const pagination = getOffsetPagination(req.query, {
    defaultSize: 50,
  });

  const users = await req.uwave.getUsers(pagination);
  return toPaginatedResponse(users, { baseUrl: req.fullUrl });
}

export async function getUser(req) {
  const user = await req.uwave.getUser(req.params.id);
  return toItemResponse(user, { url: req.fullUrl });
}

export async function setUserRole(req) {
  if (req.user.role < req.body.role) {
    throw new PermissionError('You can\'t promote users above your rank.');
  }

  const user = await req.uwave.updateUser(
    req.params.id,
    { role: req.body.role },
    { moderator: req.user }
  );

  return toItemResponse(user);
}

export async function setUserName(req) {
  const target = await req.uwave.getUser(req.params.id);

  if (target.id !== req.user.id && req.user.role < ROLE_ADMIN) {
    throw new PermissionError('You can\'t change another user\'s username.');
  }

  try {
    const user = await req.uwave.updateUser(
      target,
      { username: req.body.username },
      { moderator: req.user }
    );

    return toItemResponse(user);
  } catch (error) {
    throw beautifyDuplicateKeyError(error);
  }
}

export async function setUserAvatar(req) {
  const target = await req.uwave.getUser(req.params.id);
  if (req.user.id !== target.id && req.user.role < ROLE_MANAGER) {
    throw new PermissionError('You need to be a manager to do this.');
  }

  const user = await req.uwave.updateUser(
    req.params.id,
    { avatar: req.body.avatar },
    { moderator: req.user }
  );

  return toItemResponse(user);
}

export function setUserStatus(req) {
  if (req.user.id !== req.params.id) {
    throw new PermissionError('you can\'t change the status of another user');
  }

  req.uwave.redis.publish('v1', createCommand('statusChange', {
    userID: req.user.id,
    status: clamp(req.body.status, 0, 3),
  }));

  return toItemResponse(req.user);
}

export async function disconnectUser(uw, user) {
  const userID = typeof user === 'object' ? `${user._id}` : user;

  await skipIfCurrentDJ(uw, userID);

  try {
    await leaveWaitlist(uw, userID);
  } catch (e) {
    // Ignore
  }

  await uw.redis.lrem('users', 0, userID);

  uw.publish('user:leave', { userID });
}

export function getUserHistory(req, res) {
  return getHistoryBase(req, res, { user: req.params.id });
}
