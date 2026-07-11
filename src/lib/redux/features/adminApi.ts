import { baseApi } from "../baseApi";

export interface VisitorStats {
  totalUsers: number;
  totalVisits: number;
  uniqueVisitors: number;
  totalChats: number;
  recentVisits: SystemLog[];
}

export interface SystemLog {
  id: string;
  action: string;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export interface LogsResponse {
  logs: SystemLog[];
  count: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminModel {
  id: string;
  name: string;
  provider: string;
  isEnabled: boolean;
  description: string | null;
  createdAt: string;
}

export interface AdminApiKey {
  id: string;
  provider: string;
  keyHash: string;
  createdAt: string;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVisitorStats: builder.query<VisitorStats, void>({
      query: () => "/admin/stats",
      providesTags: ["Sessions"], // invalidate/refresh when sessions update
    }),
    getLogs: builder.query<LogsResponse, { limit?: number; offset?: number } | void>({
      query: (params) => ({
        url: "/admin/logs",
        method: "GET",
        params: {
          limit: params?.limit ?? 100,
          offset: params?.offset ?? 0,
        },
      }),
    }),
    getAdminUsers: builder.query<AdminUser[], void>({
      query: () => "/admin/users",
    }),
    toggleUserStatus: builder.mutation<AdminUser, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/toggle`,
        method: "PATCH",
      }),
    }),
    listModelsConfig: builder.query<AdminModel[], void>({
      query: () => "/admin/models",
    }),
    createModelConfig: builder.mutation<AdminModel, Partial<AdminModel>>({
      query: (body) => ({
        url: "/admin/models",
        method: "POST",
        body,
      }),
    }),
    toggleModelConfig: builder.mutation<AdminModel, string>({
      query: (modelId) => ({
        url: `/admin/models/${modelId}/toggle`,
        method: "PATCH",
      }),
    }),
    listApiKeysConfig: builder.query<AdminApiKey[], void>({
      query: () => "/admin/api-keys",
    }),
    createApiKeyConfig: builder.mutation<AdminApiKey, { provider: string; apiKey: string }>({
      query: (body) => ({
        url: "/admin/api-keys",
        method: "POST",
        body,
      }),
    }),
    deleteApiKeyConfig: builder.mutation<{ message: string }, string>({
      query: (keyId) => ({
        url: `/admin/api-keys/${keyId}`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVisitorStatsQuery,
  useGetLogsQuery,
  useGetAdminUsersQuery,
  useToggleUserStatusMutation,
  useListModelsConfigQuery,
  useCreateModelConfigMutation,
  useToggleModelConfigMutation,
  useListApiKeysConfigQuery,
  useCreateApiKeyConfigMutation,
  useDeleteApiKeyConfigMutation,
} = adminApi;
