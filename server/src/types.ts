export interface ServerUser {
  id: string;
  name: string;
}

export interface ServerRoom {
  code: string;
  users: Map<string, ServerUser>;
  createdAt: number;
}
