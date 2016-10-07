export function getServerTime() {
  return Date.now();
}

export function getRoles(uw) {
  return uw.acl.getAllRoles();
}
