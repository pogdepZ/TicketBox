export type JwtPayload = {
  sub: string;
  email: string;
};

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: string;
};
