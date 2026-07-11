import { baseApi } from "../baseApi";

export interface TranscribeResponse {
  text: string;
}

export interface GroqFile {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
}

export interface GroqFileList {
  object: string;
  data: GroqFile[];
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export const gatewayApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getModels: builder.query<ModelInfo[], { provider?: string } | void>({
      query: (params) => ({
        url: "/ai-gateway/models",
        method: "GET",
        params: params?.provider ? { provider: params.provider } : undefined,
      }),
    }),
    transcribeAudio: builder.mutation<TranscribeResponse, { file: File; provider?: string; modelId?: string }>({
      query: ({ file, provider, modelId }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/ai-gateway/transcribe",
          method: "POST",
          body: formData,
          params: {
            ...(provider ? { provider } : {}),
            ...(modelId ? { modelId } : {}),
          },
        };
      },
    }),
    uploadFile: builder.mutation<GroqFile, { file: File; purpose?: string; provider?: string }>({
      query: ({ file, purpose, provider }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/ai-gateway/files",
          method: "POST",
          body: formData,
          params: {
            ...(purpose ? { purpose } : {}),
            ...(provider ? { provider } : {}),
          },
        };
      },
    }),
    listFiles: builder.query<GroqFileList, { provider?: string } | void>({
      query: (params) => ({
        url: "/ai-gateway/files",
        method: "GET",
        params: params?.provider ? { provider: params.provider } : undefined,
      }),
    }),
    retrieveFile: builder.query<GroqFile, { fileId: string; provider?: string }>({
      query: ({ fileId, provider }) => ({
        url: `/ai-gateway/files/${fileId}`,
        method: "GET",
        params: provider ? { provider } : undefined,
      }),
    }),
    downloadFileContent: builder.query<Blob, { fileId: string; provider?: string }>({
      query: ({ fileId, provider }) => ({
        url: `/ai-gateway/files/${fileId}/content`,
        method: "GET",
        params: provider ? { provider } : undefined,
        responseHandler: (response: any) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetModelsQuery,
  useTranscribeAudioMutation,
  useUploadFileMutation,
  useListFilesQuery,
  useLazyRetrieveFileQuery,
  useLazyDownloadFileContentQuery,
} = gatewayApi;
