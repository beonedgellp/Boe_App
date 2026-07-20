import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authSlice.js';
import { adminAuthSlice } from './adminAuthSlice.js';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    adminAuth: adminAuthSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
