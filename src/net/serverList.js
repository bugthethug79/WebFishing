// The player's saved servers and "remember me" logins, kept in localStorage.

const SERVERS_KEY = 'webfishing.servers';
const LOGINS_KEY = 'webfishing.logins';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: the list just won't persist
  }
}

export function getServers() {
  return read(SERVERS_KEY, []);
}

export function addServer(address, label = '') {
  const list = getServers().filter((s) => s.address !== address);
  list.push({ address, label });
  write(SERVERS_KEY, list);
}

export function removeServer(address) {
  write(SERVERS_KEY, getServers().filter((s) => s.address !== address));
  forgetLogin(address);
}

export function getLogin(address) {
  return read(LOGINS_KEY, {})[address] ?? null;
}

export function rememberLogin(address, username, token) {
  const all = read(LOGINS_KEY, {});
  all[address] = { username, token };
  write(LOGINS_KEY, all);
}

export function forgetLogin(address) {
  const all = read(LOGINS_KEY, {});
  delete all[address];
  write(LOGINS_KEY, all);
}
