import { baseApi } from "../baseApi";

export interface RegisterDto {
  email: string;
  name: string;
  password?: string;
}

export interface LoginDto {
  email: string;
  password?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  role: string;
  avatarUrl: string | null;
  isGuest: boolean;
  isActive?: boolean;
  createdAt?: string;
  provider: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation<Tokens, RegisterDto>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    loginUser: builder.mutation<Tokens, LoginDto>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    guestLogin: builder.mutation<Tokens, void>({
      query: () => ({
        url: "/auth/guest",
        method: "POST",
      }),
    }),
    logoutUser: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    getMe: builder.query<UserProfile, void>({
      query: () => "/auth/me",
    }),
    googleLogin: builder.mutation<Tokens, { token: string }>({
      query: (body) => ({
        url: "/auth/google",
        method: "POST",
        body,
      }),
    }),
    refreshTokens: builder.mutation<Tokens, { userId: string; refreshToken: string }>({
      query: ({ userId, refreshToken }) => ({
        url: "/auth/refresh",
        method: "POST",
        body: { userId, refreshToken },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useGuestLoginMutation,
  useLogoutUserMutation,
  useGetMeQuery,
  useGoogleLoginMutation,
  useRefreshTokensMutation,
} = authApi;
