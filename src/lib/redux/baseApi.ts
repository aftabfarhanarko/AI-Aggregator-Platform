import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

interface ApiConfigState {
  baseUrl: string;
  modelName: string;
  apiKey: string;
  mode: "mock" | "live";
}

const dynamicBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const state = api.getState() as { apiConfig: ApiConfigState };
  const baseUrl = state.apiConfig?.baseUrl || "http://localhost:8000/api/v1";
  const apiKey = state.apiConfig?.apiKey;

  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      if (apiKey) {
        headers.set("Authorization", `Bearer ${apiKey}`);
      }
      return headers;
    },
  });

  return rawBaseQuery(args, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["Sessions", "Messages"],
  endpoints: () => ({}),
});
