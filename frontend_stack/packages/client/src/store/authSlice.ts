import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as authApi from '../services/authApi.js';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneMasked: string;
  status: string;
  approvalRef: string;
  riskProfileStatus: string;
  kycStatus: string;
  role: string;
  roles: string[];
  avatarInitials: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async () => {
    const user = await authApi.currentUser({ scope: 'client' });
    return user as User | null;
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { identifier: string; password: string }) => {
    const user = await authApi.login(credentials, { scope: 'client' });
    return user as User;
  }
);

export const signupUser = createAsyncThunk(
  'auth/signup',
  async (details: Record<string, unknown>) => {
    const user = await authApi.signup(details, { scope: 'client' });
    return user as User;
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await authApi.logout({ scope: 'client' });
  }
);


export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearUser(state) {
      state.user = null;
      state.isLoading = false;
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isLoading = false;
      })
      .addCase(loginUser.pending, (state) => {
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.error.message || 'Login failed';
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.error = action.error.message || 'Signup failed';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { clearUser, setUser } = authSlice.actions;
export default authSlice.reducer;
