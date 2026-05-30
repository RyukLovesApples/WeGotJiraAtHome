export interface UserSession {
  userId: string;
  username: string;
  projectIds: string[];
  lastSeen: Date;
  socketIds: string[];
}

export interface OnlineUser {
  userId: string;
  username: string;
  joinedAt: Date;
}
