import { baseApi } from "../baseApi";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CreateChatDto {
  messages: ChatMessage[];
  provider?: string;
  modelId?: string;
  sessionId?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResponseDto {
  content: string;
  modelId: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  sessionId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string | null;
  provider: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sessionId: string;
  modelId: string | null;
  provider: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendChatMessage: builder.mutation<ChatResponseDto, CreateChatDto>({
      query: (body) => ({
        url: "/chat",
        method: "POST",
        body,
      }),
      // Invalidate messages for the session if sessionId is provided
      invalidatesTags: (result, error, arg) =>
        arg.sessionId ? [{ type: "Messages", id: arg.sessionId }] : [],
    }),
    getSessions: builder.query<ChatSession[], { search?: string } | void>({
      query: (params) => ({
        url: "/chat/sessions",
        method: "GET",
        params: params?.search ? { search: params.search } : undefined,
      }),
      providesTags: ["Sessions"],
    }),
    createSession: builder.mutation<ChatSession, { title?: string; provider?: string; modelId?: string }>({
      query: (body) => ({
        url: "/chat/sessions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),
    getMessages: builder.query<Message[], string>({
      query: (sessionId) => `/chat/${sessionId}/messages`,
      providesTags: (result, error, sessionId) => [{ type: "Messages", id: sessionId }],
    }),
    renameSession: builder.mutation<ChatSession, { sessionId: string; title: string }>({
      query: ({ sessionId, title }) => ({
        url: `/chat/${sessionId}`,
        method: "PATCH",
        body: { title },
      }),
      invalidatesTags: ["Sessions"],
    }),
    deleteSession: builder.mutation<{ message: string }, string>({
      query: (sessionId) => ({
        url: `/chat/${sessionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Sessions"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendChatMessageMutation,
  useGetSessionsQuery,
  useCreateSessionMutation,
  useGetMessagesQuery,
  useRenameSessionMutation,
  useDeleteSessionMutation,
} = chatApi;
