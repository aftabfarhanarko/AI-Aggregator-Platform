import { baseApi } from "../baseApi";

export interface HealthResponse {
  status: string;
  timestamp: string;
  details: {
    database: string;
    providers: Record<string, string>;
  };
}

export const healthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => "/health",
    }),
  }),
  overrideExisting: false,
});

export const { useGetHealthQuery } = healthApi;
