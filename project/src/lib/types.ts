export type Strategy = {
  id: string;
  name: string;
  description?: string;
};

export type Session = {
  id: string;
  userId?: string;
  createdAt?: string;
};
