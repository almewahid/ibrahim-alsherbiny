import { base44 } from './base44Client';

export const Query = base44.entities.Query;

// auth sdk - disabled auto me() call
export const User = {
  ...base44.auth,
  me: () => Promise.resolve(null)
};