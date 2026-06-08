import { mockUsers } from '@/lib/mock-data';

export interface MockAuthRole {
  name: string;
  permissions: string[];
}

export interface MockAuthUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: 'ACTIVE' | 'BLOCKED' | 'DELETED';
  roles: MockAuthRole[];
  password: string;
}

export interface MockAuthSession {
  user: Omit<MockAuthUser, 'password'>;
  accessToken: string;
}

const USERS_KEY = 'ticketbox-mock-users';
const SESSION_KEY = 'ticketbox-mock-session';

function toPublicUser(user: MockAuthUser): MockAuthSession['user'] {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

function defaultUsers(): MockAuthUser[] {
  return mockUsers.map((user) => ({
    id: user.id,
    email: user.email,
    phone: user.phone ?? null,
    fullName: user.fullName,
    status: 'ACTIVE',
    roles: [
      user.role === 'Quản trị viên'
        ? { name: 'admin', permissions: ['concert:create', 'concert:update', 'concert:publish'] }
        : { name: 'customer', permissions: ['order:create', 'ticket:read'] },
    ],
    password: user.password ?? 'password123',
  }));
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getMockUsers(): MockAuthUser[] {
  if (!canUseStorage()) {
    return defaultUsers();
  }

  const stored = window.localStorage.getItem(USERS_KEY);
  if (!stored) {
    const users = defaultUsers();
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  }

  try {
    return JSON.parse(stored) as MockAuthUser[];
  } catch {
    const users = defaultUsers();
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  }
}

function saveMockUsers(users: MockAuthUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function createMockToken(user: MockAuthUser) {
  return `mock-access-token.${btoa(`${user.id}:${user.email}`)}.${Date.now()}`;
}

export function loginMock(email: string, password: string): MockAuthSession {
  const user = getMockUsers().find((item) => item.email.toLowerCase() === email.toLowerCase());

  if (!user || user.password !== password || user.status !== 'ACTIVE') {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  const session = {
    user: toPublicUser(user),
    accessToken: createMockToken(user),
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('ticketbox-auth-change'));
  return session;
}

export function registerMock(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): MockAuthSession {
  const users = getMockUsers();
  const email = input.email.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === email)) {
    throw new Error('Email đã tồn tại.');
  }

  const user: MockAuthUser = {
    id: `user-${Date.now()}`,
    email,
    phone: input.phone?.trim() || null,
    fullName: input.fullName.trim(),
    status: 'ACTIVE',
    roles: [{ name: 'customer', permissions: ['order:create', 'ticket:read'] }],
    password: input.password,
  };

  saveMockUsers([...users, user]);

  const session = {
    user: toPublicUser(user),
    accessToken: createMockToken(user),
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('ticketbox-auth-change'));
  return session;
}

export function getCurrentMockSession(): MockAuthSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const stored = window.localStorage.getItem(SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as MockAuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function logoutMock() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('ticketbox-auth-change'));
}
