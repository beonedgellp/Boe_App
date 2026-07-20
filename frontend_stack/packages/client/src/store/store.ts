import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authSlice.ts';
import { adminAuthSlice } from './adminAuthSlice.ts';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    adminAuth: adminAuthSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
