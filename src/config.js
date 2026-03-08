// Use a nova API (PostgreSQL) quando REACT_APP_USE_API=true
export const USE_API = process.env.REACT_APP_USE_API === 'true';
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
