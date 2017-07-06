import { NotFoundError } from '../errors';
import toListResponse from '../utils/toListResponse';
import toItemResponse from '../utils/toItemResponse';

export async function getAll(req, res) {
  const emoji = req.uwave.emoji;

  return toListResponse(
    await emoji.list(),
    { url: req.fullUrl }
  );
}

export async function getEmoji(req, res) {
  const emoji = req.uwave.emoji;

  const data = await emoji.getEmoji(req.params.shortcode);
  if (!data) {
    throw new NotFoundError();
  }

  return toItemResponse(data, { url: req.fullUrl });
}

export async function addCustomEmoji(req, res) {
  const emoji = req.uwave.emoji;

  await emoji.addCustomEmoji(req.user, req.params.shortcode, req);

  return toItemResponse({}, { url: req.fullUrl });
}

export async function deleteCustomEmoji(req, res) {
  const emoji = req.uwave.emoji;

  await emoji.deleteCustomEmoji(req.user, req.params.shortcode);

  return toItemResponse({}, { url: req.fullUrl });
}
