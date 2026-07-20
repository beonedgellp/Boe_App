import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as authApi from '../services/authApi.js';
import type { User } from './authSlice.js';

interface AdminAuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminAuthState = {
  user: null,
  isLoading: true,
  error: null,
};

export const fetchAdminUser = createAsyncThunk(
  'adminAuth/fetchCurrentUser',
  async () => {
    const user = await authApi.currentUser({ scope: 'admin' });
    return user as User | null;
  }
);

export const loginAdmin = createAsyncThunk(
  'adminAuth/login',
  async (credentials: { identifier: string; password: string }) => {
    const user = await authApi.login(credentials, { scope: 'admin' });
    return user as User;
  }
);

export const logoutAdmin = createAsyncThunk(
  'adminAuth/logout',
  async () => {
    await authApi.logout({ scope: 'admin' });
  }
);

export const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    clearAdminUser(state) {
      state.user = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchAdminUser.rejected, (state) => {
        state.user = null;
        state.isLoading = false;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.error = action.error.message || 'Login failed';
      })
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { clearAdminUser } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
