"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  History,
  Settings2,
  Sliders,
  Globe,
  Code,
  BookOpen,
  Plus,
  Send,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Flame,
  Link,
  Shield,
  Menu,
  X,
  FileText,
  Volume2,
  UploadCloud,
  Download,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/store";
import { updateConfig } from "@/lib/redux/slices/apiConfigSlice";
import {
  useSendChatMessageMutation,
  useGetSessionsQuery,
  useCreateSessionMutation,
  useGetMessagesQuery,
  useRenameSessionMutation,
  useDeleteSessionMutation,
} from "@/lib/redux/features/chatApi";
import {
  useGetModelsQuery,
  useTranscribeAudioMutation,
  useUploadFileMutation,
  useListFilesQuery,
  useLazyRetrieveFileQuery,
  useLazyDownloadFileContentQuery,
} from "@/lib/redux/features/gatewayApi";
import {
  useRegisterUserMutation,
  useLoginUserMutation,
  useGuestLoginMutation,
  useLogoutUserMutation,
  useGetMeQuery,
  useGoogleLoginMutation,
  useRefreshTokensMutation,
} from "@/lib/redux/features/authApi";
import {
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
} from "@/lib/redux/features/adminApi";
import { useGetHealthQuery } from "@/lib/redux/features/healthApi";

// ---------- Types ----------
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinkingTime?: number;
  thinkingSteps?: string[];
  sources?: Source[];
  isSearching?: boolean;
}

interface Source {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

interface SearchHistoryItem {
  query: string;
  count: number;
  lastSearched: string;
}

interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: {
    webSearch: boolean;
    codeSandbox: boolean;
    calculator: boolean;
  };
}

const DEFAULT_SYSTEM_PROMPT =
  "You are an advanced search agent designed to crawl multiple index providers, compare documentation, extract key takeaways, and synthesize high-fidelity insights. Cite all sources.";

export default function AgentPlayground() {
  // --- Redux / API ---
  const apiConfig = useAppSelector((state) => state.apiConfig);
  const dispatch = useAppDispatch();

  const [sendChatMessage] = useSendChatMessageMutation();
  const [createSession] = useCreateSessionMutation();
  const [renameSession] = useRenameSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();

  const { data: dbSessions, isLoading: isLoadingSessions } = useGetSessionsQuery(undefined, {
    skip: apiConfig.mode !== "live",
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: dbMessages } = useGetMessagesQuery(selectedSessionId || "", {
    skip: apiConfig.mode !== "live" || !selectedSessionId,
  });

  // --- Local state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"history" | "files" | "analytics">("history");

  // Auth Form State
  const [authType, setAuthType] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Files & Audio State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribeProvider, setTranscribeProvider] = useState<string>("groq");
  const [transcribeModel, setTranscribeModel] = useState<string>("whisper-large-v3");
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePurpose, setFilePurpose] = useState<string>("batch");
  const [fileProvider, setFileProvider] = useState<string>("groq");

  // Gateway & Auth/Admin Hooks
  const [downloadFile] = useLazyDownloadFileContentQuery();
  const [uploadFileMutation, { isLoading: isUploadingFile }] = useUploadFileMutation();
  const [transcribeAudioMutation, { isLoading: isTranscribingAudio }] = useTranscribeAudioMutation();
  const { data: fileList, refetch: refetchFiles } = useListFilesQuery(
    { provider: fileProvider },
    { skip: apiConfig.mode !== "live" }
  );

  const [registerUser, { isLoading: isRegistering }] = useRegisterUserMutation();
  const [loginUser, { isLoading: isLoggingIn }] = useLoginUserMutation();
  const [guestLogin, { isLoading: isGuestLoggingIn }] = useGuestLoginMutation();
  const [logoutUser] = useLogoutUserMutation();
  const [googleLogin, { isLoading: isGoogleLoggingIn }] = useGoogleLoginMutation();

  const { data: currentUser, refetch: refetchMe } = useGetMeQuery(undefined, {
    skip: apiConfig.mode !== "live" || !apiConfig.apiKey,
  });

  const { data: visitorStats, refetch: refetchStats } = useGetVisitorStatsQuery(undefined, {
    skip: apiConfig.mode !== "live" || !apiConfig.apiKey,
  });

  const { data: logsResponse, refetch: refetchLogs } = useGetLogsQuery(undefined, {
    skip: apiConfig.mode !== "live" || !apiConfig.apiKey,
  });

  const { data: healthData, refetch: refetchHealth } = useGetHealthQuery(undefined, {
    skip: apiConfig.mode !== "live",
  });

  const { data: modelsConfig, refetch: refetchModelsConfig } = useListModelsConfigQuery(undefined, {
    skip: apiConfig.mode !== "live" || !apiConfig.apiKey || currentUser?.role !== "admin",
  });

  const [toggleModelConfig] = useToggleModelConfigMutation();

  const { data: apiKeysConfig, refetch: refetchApiKeysConfig } = useListApiKeysConfigQuery(undefined, {
    skip: apiConfig.mode !== "live" || !apiConfig.apiKey || currentUser?.role !== "admin",
  });

  const [createApiKeyConfig] = useCreateApiKeyConfigMutation();
  const [deleteApiKeyConfig] = useDeleteApiKeyConfigMutation();

  // Admin Config Local Form State
  const [newKeyProvider, setNewKeyProvider] = useState("groq");
  const [newKeyValue, setNewKeyValue] = useState("");

  const [clientIp, setClientIp] = useState<string>("");

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip))
      .catch(() => setClientIp("127.0.0.1"));
  }, []);

  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: "Web Aggregator Agent",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    model: "openrouter:deepseek/deepseek-r1",
    temperature: 0.3,
    maxTokens: 4096,
    tools: { webSearch: true, codeSandbox: true, calculator: false },
  });

  const [deepResearch, setDeepResearch] = useState(true);
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["web", "code"]);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load Google Identity Services SDK script
  useEffect(() => {
    if (apiConfig.mode !== "live") return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [apiConfig.mode]);

  // Render Google Button when tab changes and ref is ready
  useEffect(() => {
    if (apiConfig.mode !== "live" || currentUser) return;
    
    const timer = setTimeout(() => {
      if ((window as any).google && googleBtnRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "436856087508-3j19i2b45gh3744p7n17p1b5d1n90184.apps.googleusercontent.com",
          callback: async (response: any) => {
            try {
              const res = await googleLogin({ token: response.credential }).unwrap();
              dispatch(updateConfig({ ...apiConfig, apiKey: res.accessToken }));
              alert("Logged in with Google successfully!");
            } catch (err: any) {
              alert(err?.data?.message || "Google Authentication failed");
            }
          },
        });

        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "medium",
          text: "signin_with",
          shape: "rectangular",
          width: 220,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [apiConfig.mode, sidebarTab, currentUser, googleLogin]);

  // --- Effects ---
  useEffect(() => {
    if (apiConfig.mode === "live" && apiConfig.apiKey) {
      refetchMe?.();
      refetchStats?.();
      refetchLogs?.();
      refetchHealth?.();
      if (currentUser?.role === "admin") {
        refetchModelsConfig?.();
        refetchApiKeysConfig?.();
      }
    }
  }, [apiConfig.apiKey, apiConfig.mode, refetchMe, refetchStats, refetchLogs, refetchHealth, refetchModelsConfig, refetchApiKeysConfig, currentUser?.role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("agent_search_history");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch {
        // ignore corrupt cache
      }
    }

    setMessages([welcomeMessage(agentConfig)]);

    const savedApi = localStorage.getItem("agent_api_config");
    if (savedApi) {
      try {
        dispatch(updateConfig(JSON.parse(savedApi)));
      } catch {
        // ignore corrupt cache
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (apiConfig.mode === "live" && dbMessages) {
      setMessages(
        dbMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
          thinkingTime: m.latencyMs ? parseFloat((m.latencyMs / 1000).toFixed(2)) : undefined,
          thinkingSteps:
            m.role === "assistant"
              ? [`Model: ${m.modelId}`, `Provider: ${m.provider}`]
              : undefined,
          sources: [],
        }))
      );
    }
  }, [dbMessages, apiConfig.mode]);

  // --- Helpers ---
  const handleApiConfigChange = (key: string, value: string) => {
    const updated = { ...apiConfig, [key]: value };
    dispatch(updateConfig({ [key]: value }));
    localStorage.setItem("agent_api_config", JSON.stringify(updated));
  };

  const recordSearchQuery = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    setSearchHistory((prev) => {
      const existing = prev.find((item) => item.query.toLowerCase() === trimmed.toLowerCase());
      const updated = existing
        ? prev.map((item) =>
          item.query.toLowerCase() === trimmed.toLowerCase()
            ? { ...item, count: item.count + 1, lastSearched: "Just now" }
            : item
        )
        : [{ query: trimmed, count: 1, lastSearched: "Just now" }, ...prev];

      const sorted = [...updated].sort((a, b) => b.count - a.count);
      localStorage.setItem("agent_search_history", JSON.stringify(sorted));
      return sorted;
    });
  };

  const deleteHistoryItem = (e: React.MouseEvent, queryText: string) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item.query !== queryText);
      localStorage.setItem("agent_search_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("agent_search_history");
  };

  const toggleEngine = (engine: string) => {
    if (selectedEngines.includes(engine)) {
      if (selectedEngines.length > 1) setSelectedEngines(selectedEngines.filter((e) => e !== engine));
    } else {
      setSelectedEngines([...selectedEngines, engine]);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const mapModelToProviderAndId = (selectedModel: string): { provider: string; modelId: string } => {
    if (selectedModel.includes(":")) {
      const idx = selectedModel.indexOf(":");
      return { provider: selectedModel.substring(0, idx), modelId: selectedModel.substring(idx + 1) };
    }
    return { provider: "gemini", modelId: "gemini-1.5-flash" };
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authType === "login") {
        const res = await loginUser({ email: authEmail, password: authPassword }).unwrap();
        dispatch(updateConfig({ ...apiConfig, apiKey: res.accessToken }));
        alert("Logged in successfully!");
      } else {
        const res = await registerUser({ name: authName, email: authEmail, password: authPassword }).unwrap();
        dispatch(updateConfig({ ...apiConfig, apiKey: res.accessToken }));
        alert("Registered successfully!");
      }
      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      alert(err?.data?.message || "Authentication failed");
    }
  };

  const handleGuestLogin = async () => {
    try {
      const res = await guestLogin().unwrap();
      dispatch(updateConfig({ ...apiConfig, apiKey: res.accessToken }));
      alert("Logged in as Guest!");
    } catch (err: any) {
      alert(err?.data?.message || "Guest login failed");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
    } catch (err) {
      // ignore
    }
    dispatch(updateConfig({ ...apiConfig, apiKey: "" }));
    alert("Logged out successfully");
  };

  const handleNewSession = () => {
    setSelectedSessionId(null);
    setMessages([welcomeMessage(agentConfig)]);
  };

  const handleCreateSession = async () => {
    try {
      const { provider, modelId } = mapModelToProviderAndId(agentConfig.model);
      const newSess = await createSession({ title: "New Research Session", provider, modelId }).unwrap();
      setSelectedSessionId(newSess.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  // --- Search submit (live + mock) ---
  const handleSearchSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || isGenerating) return;

    setQuery("");
    recordSearchQuery(activeQuery);

    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: activeQuery, timestamp: new Date() },
    ]);
    setIsGenerating(true);

    const agentMsgId = `agent-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: agentMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isSearching: true,
        thinkingSteps: ["Initializing agent connection...", "Verifying search weights..."],
        sources: [],
      },
    ]);

    if (apiConfig.mode === "live") {
      try {
        const { provider, modelId } = mapModelToProviderAndId(agentConfig.model);
        const pastMessages = messages
          .filter((m) => !m.id.startsWith("welcome"))
          .map((m) => ({ role: m.role, content: m.content }));
        const apiMessages = [...pastMessages, { role: "user" as const, content: activeQuery }];

        const response = await sendChatMessage({
          messages: apiMessages,
          provider,
          modelId,
          sessionId: selectedSessionId || undefined,
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
          systemPrompt: agentConfig.systemPrompt,
        }).unwrap();

        if (response.sessionId) setSelectedSessionId(response.sessionId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                ...m,
                content: response.content,
                isSearching: false,
                thinkingTime: response.latencyMs
                  ? parseFloat((response.latencyMs / 1000).toFixed(2))
                  : undefined,
                thinkingSteps: [`Provider: ${response.provider}`, `Model: ${response.modelId}`],
              }
              : m
          )
        );
      } catch (err: any) {
        const errorMessage =
          err?.data?.message || err?.message || "An error occurred while connecting to the model. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId ? { ...m, content: `### Connection Error\n${errorMessage}`, isSearching: false } : m
          )
        );
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Mock mode simulation
    let steps: string[] = [];
    const updateSteps = (newStep: string) => {
      steps = [...steps, newStep];
      setMessages((prev) => prev.map((m) => (m.id === agentMsgId ? { ...m, thinkingSteps: steps } : m)));
    };

    try {
      await wait(700);
      updateSteps(`Expanding query: "${activeQuery}"`);

      await wait(900);
      updateSteps(`Querying engines: [${selectedEngines.map((e) => e.toUpperCase()).join(", ")}]`);

      await wait(1000);
      const mockSources = getMockSources(activeQuery);
      setMessages((prev) => prev.map((m) => (m.id === agentMsgId ? { ...m, sources: mockSources } : m)));
      updateSteps("Retrieved results. Extracting relevant chunks...");

      await wait(800);
      updateSteps("Synthesizing final answer...");

      await wait(600);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? {
              ...m,
              content: getSimulatedResponse(activeQuery, agentConfig, deepResearch),
              isSearching: false,
              thinkingTime: deepResearch ? 4.0 : 2.2,
            }
            : m
        )
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? { ...m, content: "### Error\nSomething went wrong. Please try again.", isSearching: false }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-orange-50/40 text-neutral-900 overflow-hidden font-sans">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside
        className={cn(
          "w-[85vw] max-w-80 border-r border-orange-100 bg-white flex flex-col h-full shrink-0 transition-transform duration-300 z-30 fixed md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none tracking-tight text-neutral-900">AGENTS.AI</h1>
              <span className="text-[10px] text-orange-600 font-mono tracking-wider font-semibold">
                SEARCH PLATFORM
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-orange-50 text-neutral-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 shrink-0">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-xs font-semibold text-orange-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Research Session
          </button>
        </div>

        {/* Tabs toggle (only when live mode is active) */}
        {apiConfig.mode === "live" && (
          <div className="px-3 pb-2 border-b border-orange-100 flex gap-1">
            <button
              onClick={() => setSidebarTab("history")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center border transition-all flex items-center justify-center gap-1",
                sidebarTab === "history"
                  ? "bg-orange-50 border-orange-200 text-orange-700 font-bold"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 bg-white"
              )}
            >
              <History className="h-3 w-3" />
              History
            </button>
            <button
              onClick={() => setSidebarTab("files")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center border transition-all flex items-center justify-center gap-1",
                sidebarTab === "files"
                  ? "bg-orange-50 border-orange-200 text-orange-700 font-bold"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 bg-white"
              )}
            >
              <FileText className="h-3 w-3" />
              Files
            </button>
            <button
              onClick={() => setSidebarTab("analytics")}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center border transition-all flex items-center justify-center gap-1",
                sidebarTab === "analytics"
                  ? "bg-orange-50 border-orange-200 text-orange-700 font-bold"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 bg-white"
              )}
            >
              <Globe className="h-3 w-3" />
              Visitor Stats
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-5">
          {sidebarTab === "files" && apiConfig.mode === "live" ? (
            <div className="space-y-6">
              {/* --- AUDIO TRANSCRIPTION CARD --- */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                <div className="flex items-center gap-2 border-b border-orange-100/50 pb-2">
                  <Volume2 className="h-4.5 w-4.5 text-orange-600" />
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">Whisper Audio</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono">Provider</label>
                      <select
                        value={transcribeProvider}
                        onChange={(e) => setTranscribeProvider(e.target.value)}
                        className="w-full text-[10px] py-1 px-2 rounded bg-white border border-orange-100 text-neutral-700 focus:outline-none"
                      >
                        <option value="groq">Groq Cloud</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono">Model</label>
                      <select
                        value={transcribeModel}
                        onChange={(e) => setTranscribeModel(e.target.value)}
                        className="w-full text-[10px] py-1 px-2 rounded bg-white border border-orange-100 text-neutral-700 focus:outline-none"
                      >
                        <option value="whisper-large-v3">Whisper V3</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono block mb-1">Audio File</label>
                    <input
                      type="file"
                      accept="audio/*"
                      id="audio-upload-input"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAudioFile(file);
                      }}
                    />
                    <label
                      htmlFor="audio-upload-input"
                      className="flex flex-col items-center justify-center border border-dashed border-orange-200 hover:border-orange-400 bg-white rounded-lg p-4 cursor-pointer transition-colors text-center"
                    >
                      <Music className="h-6 w-6 text-orange-500 mb-1" />
                      <span className="text-[11px] font-bold text-neutral-600 truncate max-w-full">
                        {audioFile ? audioFile.name : "Select Audio File"}
                      </span>
                      <span className="text-[9px] text-neutral-400 mt-0.5">
                        {audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : "MP3, WAV, M4A up to 25MB"}
                      </span>
                    </label>
                  </div>

                  {audioFile && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await transcribeAudioMutation({
                            file: audioFile,
                            provider: transcribeProvider,
                            modelId: transcribeModel,
                          }).unwrap();
                          setTranscribedText(res.text);
                        } catch (err: any) {
                          alert(err?.data?.message || "Failed to transcribe audio");
                        }
                      }}
                      disabled={isTranscribingAudio}
                      className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isTranscribingAudio ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Transcribing...
                        </>
                      ) : (
                        "Transcribe Audio"
                      )}
                    </button>
                  )}

                  {transcribedText && (
                    <div className="space-y-1.5 pt-2 border-t border-orange-100/50">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono block">Result</label>
                      <div className="p-2.5 rounded bg-white border border-orange-100 text-neutral-700 text-xs max-h-24 overflow-y-auto leading-relaxed">
                        {transcribedText}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setQuery(transcribedText);
                            setSidebarTab("history");
                          }}
                          className="flex-1 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-[10px] rounded transition-colors"
                        >
                          Use as Prompt
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(transcribedText);
                            alert("Copied to clipboard!");
                          }}
                          className="px-2 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 text-[10px] rounded transition-colors flex items-center justify-center"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* --- FILE LIFE-CYCLE GATEWAY --- */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-orange-100/50 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-orange-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">File Gateway</h3>
                  </div>
                  <button
                    onClick={() => refetchFiles()}
                    className="p-1 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                    title="Refresh file list"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono">Provider</label>
                      <select
                        value={fileProvider}
                        onChange={(e) => setFileProvider(e.target.value)}
                        className="w-full text-[10px] py-1 px-2 rounded bg-white border border-orange-100 text-neutral-700 focus:outline-none"
                      >
                        <option value="groq">Groq Cloud</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono">Purpose</label>
                      <select
                        value={filePurpose}
                        onChange={(e) => setFilePurpose(e.target.value)}
                        className="w-full text-[10px] py-1 px-2 rounded bg-white border border-orange-100 text-neutral-700 focus:outline-none"
                      >
                        <option value="batch">batch</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 uppercase font-mono block mb-1">Select File</label>
                    <input
                      type="file"
                      id="gateway-file-upload-input"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedFile(file);
                      }}
                    />
                    <label
                      htmlFor="gateway-file-upload-input"
                      className="flex flex-col items-center justify-center border border-dashed border-orange-200 hover:border-orange-400 bg-white rounded-lg p-3 cursor-pointer transition-colors text-center"
                    >
                      <UploadCloud className="h-5 w-5 text-orange-500 mb-1" />
                      <span className="text-[10px] font-bold text-neutral-600 truncate max-w-xs">
                        {uploadedFile ? uploadedFile.name : "Choose File"}
                      </span>
                    </label>
                  </div>

                  {uploadedFile && (
                    <button
                      onClick={async () => {
                        try {
                          await uploadFileMutation({
                            file: uploadedFile,
                            purpose: filePurpose,
                            provider: fileProvider,
                          }).unwrap();
                          setUploadedFile(null);
                          refetchFiles();
                          alert("File uploaded successfully!");
                        } catch (err: any) {
                          alert(err?.data?.message || "Failed to upload file");
                        }
                      }}
                      disabled={isUploadingFile}
                      className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isUploadingFile ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload to Gateway"
                      )}
                    </button>
                  )}

                  <div className="pt-2 border-t border-orange-100/50">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono block mb-1.5">
                      Stored Files
                    </span>
                    {!fileList?.data || fileList.data.length === 0 ? (
                      <div className="text-center py-3 text-[10px] text-neutral-400 bg-white rounded border border-orange-100">
                        No files on provider.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {fileList.data.map((file) => (
                          <div
                            key={file.id}
                            className="p-2 rounded bg-white border border-orange-100 flex items-center justify-between text-[10px]"
                          >
                            <div className="max-w-[70%]">
                              <p className="font-bold text-neutral-700 truncate" title={file.filename}>
                                {file.filename}
                              </p>
                              <span className="text-neutral-400 text-[8px] font-mono">
                                {(file.bytes / 1024).toFixed(1)} KB • {new Date(file.created_at * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  try {
                                    const blob = await downloadFile({ fileId: file.id, provider: fileProvider }).unwrap();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = file.filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                  } catch (err) {
                                    alert("Failed to download file");
                                  }
                                }}
                                className="p-1 rounded hover:bg-orange-50 text-orange-600 transition-colors"
                                title="Download file"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  alert(
                                    `File Details:\nID: ${file.id}\nObject: ${file.object}\nBytes: ${file.bytes}\nCreated At: ${new Date(
                                      file.created_at * 1000
                                    ).toLocaleString()}\nPurpose: ${file.purpose}`
                                  );
                                }}
                                className="p-1 rounded hover:bg-orange-50 text-neutral-500 transition-colors"
                                title="View details"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : sidebarTab === "analytics" && apiConfig.mode === "live" ? (
            <div className="space-y-6">
              {/* --- AUTHENTICATION CARD --- */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                <div className="flex items-center gap-2 border-b border-orange-100/50 pb-2">
                  <Shield className="h-4.5 w-4.5 text-orange-600" />
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">Authentication</h3>
                </div>

                {currentUser ? (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded bg-white border border-orange-100 space-y-1">
                      <div className="text-[10px] text-neutral-400 font-mono">Logged in as</div>
                      <div className="text-xs font-bold text-neutral-800">{currentUser.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{currentUser.email || "guest@local"}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-orange-50 border border-orange-100 text-orange-700 uppercase">
                          Role: {currentUser.role}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-orange-50 border border-orange-100 text-orange-700 uppercase">
                          Provider: {currentUser.provider}
                        </span>
                      </div>
                      {clientIp && (
                        <div className="text-[8px] text-neutral-400 font-mono mt-1 pt-1 border-t border-orange-100/50">
                          IP Origin: {clientIp}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-lg transition-colors"
                    >
                      Logout Session
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div className="flex bg-white rounded-lg border border-orange-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setAuthType("login")}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded transition-all",
                          authType === "login" ? "bg-orange-50 text-orange-700" : "text-neutral-400"
                        )}
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthType("register")}
                        className={cn(
                          "flex-1 py-1 text-[10px] font-bold rounded transition-all",
                          authType === "register" ? "bg-orange-50 text-orange-700" : "text-neutral-400"
                        )}
                      >
                        Register
                      </button>
                    </div>

                    <div className="space-y-2">
                      {authType === "register" && (
                        <div>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            required
                            className="w-full text-[10px] py-1.5 px-2.5 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 text-neutral-700 font-mono"
                          />
                        </div>
                      )}
                      <div>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          required
                          className="w-full text-[10px] py-1.5 px-2.5 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 text-neutral-700 font-mono"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          placeholder="Password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          required
                          className="w-full text-[10px] py-1.5 px-2.5 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 text-neutral-700 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn || isRegistering}
                      className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoggingIn || isRegistering ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : authType === "login" ? (
                        "Log In"
                      ) : (
                        "Register"
                      )}
                    </button>

                    <div className="flex justify-center py-1.5 overflow-hidden">
                      <div ref={googleBtnRef} className="max-w-full" />
                    </div>

                    <div className="relative flex items-center justify-center my-2 text-[8px] font-bold text-neutral-400 uppercase tracking-widest">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-orange-100/50" /></div>
                      <span className="relative px-2 bg-white/10 text-neutral-400">or</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGuestLogin}
                      disabled={isGuestLoggingIn}
                      className="w-full py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isGuestLoggingIn ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Continue as Guest"
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* --- VISITOR ANALYTICS CARD --- */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-orange-100/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4.5 w-4.5 text-orange-600" />
                    <div>
                      <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">Visitor Analytics</h3>
                      {clientIp && (
                        <span className="text-[8px] text-neutral-400 font-mono block leading-none mt-0.5">Your IP: {clientIp}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => refetchStats?.()}
                    className="p-1 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                    title="Refresh stats"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {!visitorStats ? (
                  <div className="text-center py-4 text-[10px] text-neutral-400 bg-white rounded border border-orange-100">
                    Authenticate to view stats.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded border border-orange-100 text-center">
                        <div className="text-[18px] font-black text-orange-600 leading-none">{visitorStats.uniqueVisitors}</div>
                        <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Unique IPs</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-orange-100 text-center">
                        <div className="text-[18px] font-black text-orange-600 leading-none">{visitorStats.totalVisits}</div>
                        <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Total Visits</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-orange-100 text-center">
                        <div className="text-[18px] font-black text-orange-600 leading-none">{visitorStats.totalChats}</div>
                        <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Total Chats</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-orange-100 text-center">
                        <div className="text-[18px] font-black text-orange-600 leading-none">{visitorStats.totalUsers}</div>
                        <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Registered</span>
                      </div>
                    </div>

                    {/* Recent IP Addresses List */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono block">
                        Recent Visitor IPs
                      </span>
                      {visitorStats.recentVisits.length === 0 ? (
                        <div className="text-center py-2 text-[9px] text-neutral-400 bg-white rounded border border-orange-100">
                          No visits logged.
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1 font-mono">
                          {visitorStats.recentVisits.map((visit) => (
                            <div
                              key={visit.id}
                              className="p-2 rounded bg-white border border-orange-100 flex items-center justify-between text-[9px]"
                            >
                              <div className="truncate">
                                <span className="font-bold text-neutral-700">{visit.ipAddress || "127.0.0.1"}</span>
                                <p className="text-[7px] text-neutral-400 leading-tight">
                                  {new Date(visit.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-orange-50 border border-orange-100 text-orange-600 shrink-0">
                                {visit.action}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* --- SYSTEM AUDIT LOGS CARD --- */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-orange-100/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4.5 w-4.5 text-orange-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">System Audit Logs</h3>
                  </div>
                  <button
                    onClick={() => refetchLogs?.()}
                    className="p-1 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                    title="Refresh logs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {!logsResponse?.logs ? (
                  <div className="text-center py-4 text-[10px] text-neutral-400 bg-white rounded border border-orange-100">
                    Authenticate to view logs.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {logsResponse.logs.length === 0 ? (
                      <div className="text-center py-3 text-[9px] text-neutral-400 bg-white rounded border border-orange-100">
                        No audit logs available.
                      </div>
                    ) : (
                      logsResponse.logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded bg-white border border-orange-100 text-[9px] font-mono leading-relaxed"
                        >
                          <div className="flex items-center justify-between font-bold text-neutral-700">
                            <span className="text-orange-600">{log.action}</span>
                            <span className="text-neutral-400 text-[7px]">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.ipAddress && (
                            <div className="text-neutral-400 text-[8px]">
                              IP: {log.ipAddress}
                            </div>
                          )}
                          {log.metadata && (
                            <div className="text-neutral-500 text-[7px] bg-neutral-50 p-1 rounded mt-0.5 truncate max-w-full" title={log.metadata}>
                              {log.metadata}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* --- HEALTH CHECK CARD --- */}
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-orange-100/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4.5 w-4.5 text-emerald-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">Backend Health</h3>
                  </div>
                  <button
                    onClick={() => refetchHealth?.()}
                    className="p-1 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                    title="Check health"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {healthData ? (
                  <div className="space-y-3 text-[10px] font-mono">
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-orange-100">
                      <span className="text-neutral-500 font-bold">DATABASE</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {healthData.details?.database?.toUpperCase() || "UP"}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded border border-orange-100 space-y-1.5">
                      <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Providers Status</div>
                      {Object.entries(healthData.details?.providers || {}).map(([provider, status]) => (
                        <div key={provider} className="flex items-center justify-between text-[9px]">
                          <span className="text-neutral-600 capitalize font-medium">{provider}</span>
                          <span className={cn(
                            "px-1 py-0.2 rounded text-[8px] font-bold",
                            status === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          )}>
                            {status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-[10px] text-neutral-400">
                    Failed to fetch health check status.
                  </div>
                )}
              </div>

              {/* --- MODEL CONFIGURATION CARD --- */}
              {currentUser?.role === "admin" && (
                <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-orange-100/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4.5 w-4.5 text-orange-600" />
                      <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">AI Model Configs</h3>
                    </div>
                    <button
                      onClick={() => refetchModelsConfig?.()}
                      className="p-1 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                      title="Refresh models"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!modelsConfig ? (
                    <div className="text-center py-3 text-[9px] text-neutral-400 bg-white rounded border border-orange-100">
                      Loading model configs...
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {modelsConfig.map((model) => (
                        <div
                          key={model.id}
                          className="p-2 rounded bg-white border border-orange-100 flex items-center justify-between text-[9px] font-mono"
                        >
                          <div className="truncate">
                            <span className="font-bold text-neutral-700 block truncate">{model.name}</span>
                            <span className="text-[8px] text-neutral-400 uppercase tracking-wider font-mono bg-neutral-100 px-1 py-0.1 rounded border">
                              {model.provider}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await toggleModelConfig(model.id).unwrap();
                                refetchModelsConfig?.();
                                alert("Model toggled successfully!");
                              } catch (err) {
                                alert("Failed to toggle model");
                              }
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors",
                              model.isEnabled
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            )}
                          >
                            {model.isEnabled ? "Enabled" : "Disabled"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- API KEY CONFIGURATION CARD --- */}
              {currentUser?.role === "admin" && (
                <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-orange-100/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4.5 w-4.5 text-orange-600" />
                      <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">Backend API Keys</h3>
                    </div>
                    <button
                      onClick={() => refetchApiKeysConfig?.()}
                      className="p-1 rounded hover:bg-orange-100 text-orange-600 transition-colors"
                      title="Refresh keys"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Add Key Form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newKeyValue.trim()) return;
                      try {
                        await createApiKeyConfig({ provider: newKeyProvider, apiKey: newKeyValue }).unwrap();
                        setNewKeyValue("");
                        refetchApiKeysConfig?.();
                        alert("API Key registered successfully!");
                      } catch (err) {
                        alert("Failed to save API key");
                      }
                    }}
                    className="p-2 rounded bg-white border border-orange-100 space-y-2 animate-fade-in"
                  >
                    <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Register Provider Key</div>
                    <div className="flex gap-1.5">
                      <select
                        value={newKeyProvider}
                        onChange={(e) => setNewKeyProvider(e.target.value)}
                        className="text-[9px] py-1 px-1.5 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 font-mono text-neutral-700"
                      >
                        <option value="groq">Groq</option>
                        <option value="gemini">Gemini</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                      <input
                        type="password"
                        placeholder="API Key Value"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        className="flex-1 text-[9px] py-1 px-2 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 font-mono text-neutral-700"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[9px] rounded transition-colors"
                    >
                      Save Key
                    </button>
                  </form>

                  {!apiKeysConfig ? (
                    <div className="text-center py-3 text-[9px] text-neutral-400 bg-white rounded border border-orange-100">
                      Loading API keys...
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {apiKeysConfig.length === 0 ? (
                        <div className="text-center py-2 text-[9px] text-neutral-400 bg-white rounded border border-orange-100">
                          No provider keys saved yet.
                        </div>
                      ) : (
                        apiKeysConfig.map((key) => (
                          <div
                            key={key.id}
                            className="p-2 rounded bg-white border border-orange-100 flex items-center justify-between text-[9px] font-mono"
                          >
                            <div className="truncate">
                              <span className="font-bold text-neutral-700 block uppercase">{key.provider}</span>
                              <span className="text-[7px] text-neutral-400 block truncate max-w-[120px]">
                                Hash: {key.keyHash}
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete the ${key.provider} key?`)) {
                                  try {
                                    await deleteApiKeyConfig(key.id).unwrap();
                                    refetchApiKeysConfig?.();
                                    alert("API Key deleted successfully!");
                                  } catch (err) {
                                    alert("Failed to delete key");
                                  }
                                }
                              }}
                              className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors"
                              title="Delete key"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search History */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <History className="h-3 w-3 text-orange-600" />
                    History
                  </span>
                  {searchHistory.length > 0 && (
                    <button onClick={clearAllHistory} className="text-[10px] text-red-500 hover:text-red-600 font-mono font-semibold">
                      Clear All
                    </button>
                  )}
                </div>

                {searchHistory.length === 0 ? (
                  <div className="p-4 rounded-lg bg-orange-50/60 border border-orange-100 text-center">
                    <p className="text-xs text-neutral-400">No search records yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSearchSubmit(undefined, item.query)}
                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 max-w-[80%]">
                          <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0 group-hover:text-orange-600" />
                          <span className="text-xs text-neutral-600 truncate font-mono">{item.query}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-50 border border-orange-100 text-orange-700 shrink-0">
                            {item.count}x
                          </span>
                          <button
                            onClick={(e) => deleteHistoryItem(e, item.query)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-orange-100 text-neutral-400 hover:text-red-500 transition-all shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cloud Sessions */}
              {apiConfig.mode === "live" && (
                <div className="border-t border-orange-100 pt-3">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                      <Globe className="h-3 w-3 text-orange-600" />
                      Sessions
                    </span>
                    <button onClick={handleCreateSession} className="text-[10px] text-orange-600 hover:text-orange-700 font-mono font-semibold">
                      + New
                    </button>
                  </div>

                  {isLoadingSessions ? (
                    <div className="p-2 text-center text-xs text-neutral-400">Loading sessions...</div>
                  ) : !dbSessions || dbSessions.length === 0 ? (
                    <div className="p-4 rounded-lg bg-orange-50/60 border border-orange-100 text-center">
                      <p className="text-xs text-neutral-400">No sessions yet. Start chatting or hit + New.</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {dbSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={cn(
                            "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border",
                            selectedSessionId === session.id
                              ? "bg-orange-50 border-orange-200 text-orange-900 font-semibold"
                              : "hover:bg-orange-50 border-transparent text-neutral-700"
                          )}
                        >
                          <div className="flex items-center gap-2 max-w-[70%]">
                            <History className="h-3.5 w-3.5 text-neutral-400 shrink-0 group-hover:text-orange-600" />
                            <span className="text-xs truncate">{session.title}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newTitle = prompt("Rename session:", session.title);
                                if (newTitle) await renameSession({ sessionId: session.id, title: newTitle });
                              }}
                              className="p-0.5 rounded hover:bg-orange-100 text-neutral-400 hover:text-orange-600"
                            >
                              <Sliders className="h-3 w-3" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Delete this session?")) {
                                  await deleteSession(session.id);
                                  if (selectedSessionId === session.id) setSelectedSessionId(null);
                                }
                              }}
                              className="p-0.5 rounded hover:bg-orange-100 text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Endpoint config */}
        <div className="p-3 border-t border-orange-100 bg-orange-50/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 tracking-wider flex items-center gap-1 font-mono">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              ENDPOINT
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border",
                apiConfig.mode === "live"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
            >
              {apiConfig.mode === "live" ? "LIVE API" : "SANDBOX"}
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => handleApiConfigChange("mode", "mock")}
              className={cn(
                "flex-1 text-[10px] py-1 rounded font-bold text-center border transition-colors",
                apiConfig.mode === "mock"
                  ? "bg-orange-50 border-orange-300 text-orange-700"
                  : "border-orange-100 bg-white text-neutral-500 hover:bg-orange-50"
              )}
            >
              Sandbox
            </button>
            <button
              onClick={() => handleApiConfigChange("mode", "live")}
              className={cn(
                "flex-1 text-[10px] py-1 rounded font-bold text-center border transition-colors",
                apiConfig.mode === "live"
                  ? "bg-orange-50 border-orange-300 text-orange-700"
                  : "border-orange-100 bg-white text-neutral-500 hover:bg-orange-50"
              )}
            >
              Live
            </button>
          </div>

          {apiConfig.mode === "live" && (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Base URL"
                value={apiConfig.baseUrl}
                onChange={(e) => handleApiConfigChange("baseUrl", e.target.value)}
                className="w-full text-[10px] py-1 px-2 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 text-neutral-700 font-mono"
              />
              <input
                type="password"
                placeholder="API Key"
                value={apiConfig.apiKey}
                onChange={(e) => handleApiConfigChange("apiKey", e.target.value)}
                className="w-full text-[10px] py-1 px-2 rounded bg-white border border-orange-100 focus:outline-none focus:border-orange-400 text-neutral-700 font-mono"
              />
              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-mono px-1 pt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Local Server Port: 8000</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {(sidebarOpen || configOpen) && (
        <div
          onClick={() => {
            setSidebarOpen(false);
            setConfigOpen(false);
          }}
          className="fixed inset-0 bg-neutral-900/30 z-20 md:hidden"
        />
      )}

      {/* ================= CENTER: CHAT ================= */}
      <main className="flex-1 flex flex-col h-full bg-orange-50/30 relative overflow-hidden">
        <header className="h-14 border-b border-orange-100 px-3 sm:px-4 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-orange-50 border border-orange-100 text-neutral-600 shrink-0"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-neutral-600 truncate">
                Agent: <span className="text-orange-700 font-bold">{agentConfig.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center bg-orange-50 border border-orange-100 rounded-lg p-0.5">
              <button
                onClick={() => toggleEngine("web")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                  selectedEngines.includes("web") ? "bg-white text-orange-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                <Globe className="h-3 w-3" />
                Web
              </button>
              <button
                onClick={() => toggleEngine("code")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                  selectedEngines.includes("code") ? "bg-white text-orange-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                <Code className="h-3 w-3" />
                Code
              </button>
              <button
                onClick={() => toggleEngine("academic")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                  selectedEngines.includes("academic") ? "bg-white text-orange-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                <BookOpen className="h-3 w-3" />
                Academic
              </button>
            </div>

            <button
              onClick={() => setMessages([welcomeMessage(agentConfig)])}
              className="hidden sm:inline-flex text-xs py-1.5 px-3 rounded-lg border border-orange-100 hover:bg-orange-50 text-neutral-600 font-bold transition-colors bg-white"
            >
              Clear
            </button>

            <button
              onClick={() => setConfigOpen(!configOpen)}
              className={cn(
                "p-1.5 rounded-lg border transition-colors shrink-0",
                configOpen ? "bg-orange-50 text-orange-700 border-orange-200" : "hover:bg-orange-50 text-neutral-500 bg-white border-orange-100"
              )}
            >
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 sm:gap-4 max-w-4xl mx-auto items-start",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs",
                  msg.role === "user" ? "bg-neutral-200 text-neutral-700 border border-neutral-300" : "bg-orange-600 text-white"
                )}
              >
                {msg.role === "user" ? "U" : "A"}
              </div>

              <div className="flex-1 space-y-2 min-w-0 max-w-[88%] sm:max-w-[80%]">
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-semibold truncate">
                    {msg.role === "user" ? "You" : agentConfig.model}
                  </span>
                  {msg.role === "assistant" && msg.thinkingTime && (
                    <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                      {msg.thinkingTime}s
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "p-3 sm:p-4 rounded-xl text-sm leading-relaxed border shadow-sm",
                    msg.role === "user" ? "bg-orange-50 border-orange-100 text-orange-950" : "bg-white border-orange-100 text-neutral-800"
                  )}
                >
                  {msg.role === "assistant" && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                    <div className="mb-4 rounded-lg bg-orange-50/60 border border-orange-100 p-2.5">
                      <button
                        onClick={() => toggleThinking(msg.id)}
                        className="w-full flex items-center justify-between text-xs text-orange-700 font-bold"
                      >
                        <span className="flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5 text-orange-500" />
                          {msg.isSearching ? "Agent running..." : "Thought process"}
                        </span>
                        {expandedThinking[msg.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {(expandedThinking[msg.id] !== false || msg.isSearching) && (
                        <div className="mt-2 space-y-1.5 border-t border-orange-100 pt-2">
                          {msg.thinkingSteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-1.5 font-mono text-[11px] text-neutral-500">
                              <span className="text-orange-500 shrink-0">&gt;</span>
                              <span>{step}</span>
                            </div>
                          ))}
                          {msg.isSearching && (
                            <div className="flex items-center gap-2 font-mono text-[11px] text-orange-600 pl-3.5 mt-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Compiling response...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2 font-mono flex items-center gap-1">
                        <Link className="h-3 w-3 text-orange-600" /> SOURCES ({msg.sources.length})
                      </span>
                      <div className="flex gap-2.5 overflow-x-auto pb-2">
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="w-56 shrink-0 p-2.5 rounded-lg bg-orange-50/50 border border-orange-100 hover:border-orange-200 transition-colors group"
                          >
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-orange-100 border border-orange-200 text-orange-700 font-mono">
                                {src.domain}
                              </span>
                              <a href={src.url} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-orange-600 opacity-0 group-hover:opacity-100">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <h4 className="text-[11px] font-bold text-neutral-800 mt-1.5 line-clamp-1">{src.title}</h4>
                            <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1">{src.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">{parseMarkdown(msg.content)}</div>
                </div>

                <div className="flex items-center gap-2.5 px-1">
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="p-1 rounded hover:bg-orange-100 text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1 text-[11px] font-mono font-bold"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                  {msg.role === "assistant" && !msg.isSearching && (
                    <button
                      onClick={() => handleSearchSubmit(undefined, messages[messages.indexOf(msg) - 1]?.content || "")}
                      className="p-1 rounded hover:bg-orange-100 text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-1 text-[11px] font-mono font-bold"
                    >
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-orange-100 bg-orange-50/60 backdrop-blur-md shrink-0">
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-4xl mx-auto rounded-xl border border-orange-200 bg-white p-2 space-y-2 shadow-sm focus-within:border-orange-400 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Search className="h-5 w-5 text-neutral-400 mt-2 ml-2 shrink-0" />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                rows={1}
                placeholder="Ask the agent to research a topic..."
                className="flex-1 w-full bg-transparent border-0 p-1.5 focus:ring-0 focus:outline-none text-sm text-neutral-800 placeholder-neutral-400 resize-none min-h-[40px] max-h-[160px]"
              />
              <button
                type="submit"
                disabled={!query.trim() || isGenerating}
                className={cn(
                  "p-2 rounded-lg transition-colors shrink-0 mt-1 mr-1",
                  query.trim() && !isGenerating
                    ? "bg-orange-600 text-white hover:bg-orange-500 shadow-sm"
                    : "bg-orange-50 text-neutral-400 cursor-not-allowed border border-orange-100"
                )}
              >
                {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between border-t border-orange-100 pt-2 px-1 gap-2">
              <button
                type="button"
                onClick={() => setDeepResearch(!deepResearch)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition-colors",
                  deepResearch ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-white text-neutral-500 border-orange-100 hover:bg-orange-50"
                )}
              >
                <Flame className={cn("h-3.5 w-3.5", deepResearch ? "text-orange-600" : "text-neutral-400")} />
                Deep Research
              </button>

              <div className="text-[10.5px] text-neutral-500 font-mono flex items-center gap-1.5">
                <span>{selectedEngines.length} engines</span>
                <span>•</span>
                <span className="uppercase tracking-widest text-[9px] font-semibold">{apiConfig.mode}</span>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* ================= RIGHT: AGENT CONFIG ================= */}
      <aside
        className={cn(
          "w-[85vw] max-w-80 border-l border-orange-100 bg-white flex flex-col h-full shrink-0 transition-transform duration-300 z-30 fixed md:relative right-0 md:translate-x-0",
          configOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-orange-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-orange-700" />
            <h2 className="font-bold text-sm text-neutral-800 uppercase tracking-wider">Agent Settings</h2>
          </div>
          <button onClick={() => setConfigOpen(false)} className="p-1 rounded-lg hover:bg-orange-50 text-neutral-500">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Agent Name</label>
            <input
              type="text"
              value={agentConfig.name}
              onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
              className="w-full text-xs py-2 px-3 rounded-lg bg-white border border-orange-100 text-neutral-800 focus:outline-none focus:border-orange-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Model</label>
            <select
              value={agentConfig.model}
              onChange={(e) => setAgentConfig({ ...agentConfig, model: e.target.value })}
              className="w-full text-xs py-2 px-3 rounded-lg bg-white border border-orange-100 text-neutral-800 focus:outline-none focus:border-orange-400 font-medium"
            >
              <optgroup label="Groq Cloud">
                <option value="groq:llama-3.1-70b-versatile">Llama 3.1 70B</option>
                <option value="groq:gemma2-9b-it">Gemma 2 9B</option>
              </optgroup>
              <optgroup label="OpenRouter">
                <option value="openrouter:deepseek/deepseek-r1">DeepSeek R1</option>
                <option value="openrouter:openai/gpt-4o">GPT-4o</option>
                <option value="openrouter:anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              </optgroup>
              <optgroup label="Gemini">
                <option value="gemini:gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini:gemini-1.5-pro">Gemini 1.5 Pro</option>
              </optgroup>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono">System Prompt</label>
              <button
                onClick={() => setAgentConfig({ ...agentConfig, systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                className="text-[9px] text-orange-600 hover:text-orange-700 font-bold"
              >
                Reset
              </button>
            </div>
            <textarea
              rows={4}
              value={agentConfig.systemPrompt}
              onChange={(e) => setAgentConfig({ ...agentConfig, systemPrompt: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg bg-white border border-orange-100 text-neutral-700 focus:outline-none focus:border-orange-400 resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-4 pt-2 border-t border-orange-100">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-neutral-500">
                <span className="uppercase tracking-wider">Temperature</span>
                <span className="text-orange-700">{agentConfig.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={agentConfig.temperature}
                onChange={(e) => setAgentConfig({ ...agentConfig, temperature: parseFloat(e.target.value) })}
                className="w-full h-1 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-neutral-500">
                <span className="uppercase tracking-wider">Max Tokens</span>
                <span className="text-orange-700">{agentConfig.maxTokens}</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={agentConfig.maxTokens}
                onChange={(e) => setAgentConfig({ ...agentConfig, maxTokens: parseInt(e.target.value) })}
                className="w-full h-1 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-orange-100">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono block">Tools</label>
            {(
              [
                { key: "webSearch", label: "Web Search", icon: Globe },
                { key: "codeSandbox", label: "Code Sandbox", icon: Code },
                { key: "calculator", label: "Math Solver", icon: Sliders },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                onClick={() => setAgentConfig({ ...agentConfig, tools: { ...agentConfig.tools, [key]: !agentConfig.tools[key] } })}
                className="flex items-center justify-between p-2 rounded-lg bg-orange-50/50 border border-orange-100 hover:border-orange-200 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-xs text-neutral-700 font-semibold">{label}</span>
                </div>
                <div
                  className={cn(
                    "h-4 w-7 rounded-full p-0.5 flex transition-colors",
                    agentConfig.tools[key] ? "bg-orange-600 justify-end" : "bg-neutral-200 justify-start"
                  )}
                >
                  <div className="h-3 w-3 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ---------- Helpers ----------

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function welcomeMessage(config: AgentConfig): Message {
  return {
    id: `welcome-${Date.now()}`,
    role: "assistant",
    content: `### Welcome to AGENTS.AI

I'm your **${config.name}**, running on **${config.model}**.

Ask me a question, adjust my settings on the right, or revisit past searches on the left.`,
    timestamp: new Date(),
  };
}

function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  return text.split("\n").map((line, idx) => {
    if (line.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-sm font-bold text-neutral-900 mt-4 mb-2 border-b border-orange-100 pb-1">
          {line.replace("### ", "")}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-base font-bold text-neutral-800 mt-5 mb-2.5">
          {line.replace("## ", "")}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-lg font-extrabold text-orange-700 mt-6 mb-3">
          {line.replace("# ", "")}
        </h1>
      );
    }
    if (line.startsWith("```")) return null;
    if (line.startsWith("* ") || line.startsWith("- ")) {
      return (
        <li key={idx} className="list-disc list-inside ml-2.5 text-xs text-neutral-600 py-0.5">
          {boldFormatter(line.substring(2))}
        </li>
      );
    }
    if (line.trim() === "") return <div key={idx} className="h-2" />;
    return (
      <p key={idx} className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
        {boldFormatter(line)}
      </p>
    );
  });
}

function boldFormatter(text: string) {
  return text.split(/\*\*([^*]+)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-extrabold text-neutral-950">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function getMockSources(query: string): Source[] {
  const q = query.toLowerCase();
  if (q.includes("next")) {
    return [
      {
        title: "Next.js 16 Upgrade Guide and Breaking Changes",
        url: "https://nextjs.org/docs/app/building-your-application/upgrading",
        domain: "nextjs.org",
        snippet: "Walkthrough of API changes, Node.js requirement updates, and router optimizations in Next.js 16.",
      },
      {
        title: "Vercel Blog: Shipping Next.js 16",
        url: "https://vercel.com/blog/nextjs-16-announcement",
        domain: "vercel.com",
        snippet: "Turbopack by default, React 19 alignment, and faster client compilation.",
      },
    ];
  }
  if (q.includes("deepseek") || q.includes("r1")) {
    return [
      {
        title: "DeepSeek-R1: Incentivizing Reasoning in LLMs",
        url: "https://github.com/deepseek-ai/DeepSeek-R1",
        domain: "github.com/deepseek-ai",
        snippet: "Repository hosting weights, system parameters, and specifications for the open-source reasoning model.",
      },
    ];
  }
  return [
    {
      title: `Search results for '${query}'`,
      url: "https://google.com",
      domain: "google.com",
      snippet: `Compiled references matching '${query}'.`,
    },
  ];
}

function getSimulatedResponse(query: string, config: AgentConfig, deepResearch: boolean): string {
  const q = query.toLowerCase();
  if (q.includes("next")) {
    return `# Next.js 16 Analysis

### Key Changes
* **React 19 support**: full stable API migration.
* **Turbopack**: default dev bundler, faster cold starts.
* **Node.js**: requires v20.8.0+.`;
  }
  if (q.includes("deepseek") || q.includes("r1")) {
    return `# DeepSeek-R1 Report

### Architecture
* Trained with reinforcement learning for self-correcting reasoning.
* Open weights under MIT license, from 1.5B to 70B parameters.`;
  }
  return `# Results for "${query}"

Searched using **${config.model}** with ${deepResearch ? "deep research" : "standard"} mode.

Try queries like **"Next.js 16 updates"** or **"DeepSeek R1"** for a detailed example report.`;
}