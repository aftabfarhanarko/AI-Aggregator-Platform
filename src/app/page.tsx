"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Sparkles, 
  History, 
  Settings2, 
  Sliders, 
  Layers, 
  Globe, 
  Code, 
  BookOpen, 
  Plus, 
  Send, 
  RefreshCw, 
  Copy, 
  Check, 
  Info, 
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
  AudioLines,
  UploadCloud,
  FolderOpen,
  Download,
  Loader2
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

// TypeScript Interfaces
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
    imageGen: boolean;
  };
}

export default function AgentPlayground() {
  // --- Redux Store & RTK Query ---
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

  // --- Gateway tab, file, and provider states ---
  const [sidebarTab, setSidebarTab] = useState<"analytics" | "files">("analytics");
  const [selectedProvider, setSelectedProvider] = useState<string>("openrouter");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<string>("");
  const [filePurpose, setFilePurpose] = useState<string>("batch");
  const [fileGatewayProvider, setFileGatewayProvider] = useState<string>("groq");
  const [transcribeProvider, setTranscribeProvider] = useState<string>("groq");
  const [transcribeModelId, setTranscribeModelId] = useState<string>("whisper-large-v3");

  // --- Gateway API hooks ---
  const { data: dynamicModels, isLoading: isLoadingModels } = useGetModelsQuery(
    { provider: selectedProvider },
    { skip: apiConfig.mode !== "live" }
  );

  const { data: filesData, refetch: refetchFiles } = useListFilesQuery(
    { provider: fileGatewayProvider },
    { skip: apiConfig.mode !== "live" }
  );

  const [transcribeAudio, { isLoading: isTranscribing }] = useTranscribeAudioMutation();
  const [uploadFileMutation, { isLoading: isUploadingFile }] = useUploadFileMutation();
  const [lazyRetrieveFile] = useLazyRetrieveFileQuery();
  const [lazyDownloadContent] = useLazyDownloadFileContentQuery();

  const { data: dbMessages } = useGetMessagesQuery(selectedSessionId || "", {
    skip: apiConfig.mode !== "live" || !selectedSessionId,
  });

  // --- States ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Sidebar Toggles (for responsiveness)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);

  // Agent configuration settings
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: "Web Aggregator Agent",
    systemPrompt: "You are an advanced search agent designed to crawl multiple index providers, compare documentation, extract key takeaways, and synthesize high-fidelity insights. Cite all sources.",
    model: "openrouter:deepseek/deepseek-r1",
    temperature: 0.3,
    maxTokens: 4096,
    tools: {
      webSearch: true,
      codeSandbox: true,
      calculator: false,
      imageGen: false
    }
  });

  // Deep Research Toggle
  const [deepResearch, setDeepResearch] = useState(true);
  
  // Search Engine Targets
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["web", "code"]);
  
  // Chat Scroll Reference
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Initial Setup and LocalStorage Loading ---
  useEffect(() => {
    // Scroll to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    // Load search history from localStorage
    const savedHistory = localStorage.getItem("agent_search_history");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    } else {
      // Mock starting history
      const initialHistory: SearchHistoryItem[] = [
        { query: "Next.js 16 App Router deprecations", count: 18, lastSearched: "2 hours ago" },
        { query: "DeepSeek-R1 logic reasoning steps", count: 12, lastSearched: "4 hours ago" },
        { query: "Tailwind CSS v4 custom theme syntax", count: 9, lastSearched: "Yesterday" },
        { query: "React 19 Server Components API", count: 7, lastSearched: "Yesterday" },
        { query: "TypeScript 5.5 type parameters optimization", count: 3, lastSearched: "2 days ago" },
      ];
      setSearchHistory(initialHistory);
      localStorage.setItem("agent_search_history", JSON.stringify(initialHistory));
    }

    // Load initial welcome messages
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `### Welcome to **AGENTS.AI** — Multi-Engine Search Aggregator
 
I am your active **${agentConfig.name}**, initialized with **${agentConfig.model}**.
 
I can crawl, aggregate, and analyze complex information from multiple search engines, dev blogs, academic libraries, and codebases in parallel.
 
**Here is what you can do:**
* Ask me a complex question or search query.
* Customize my instructions and system prompt in the **Agent Panel** on the right.
* Check your search metrics and history count in the **History Analyzer** on the left.
* Toggle **Deep Research** mode to run multi-step sub-agent logic.
 
*What should we research today?*`,
        timestamp: new Date()
      }
    ]);

    // Load API config from localStorage
    const savedApi = localStorage.getItem("agent_api_config");
    if (savedApi) {
      try {
        dispatch(updateConfig(JSON.parse(savedApi)));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Sync loaded database messages to local messages feed
  useEffect(() => {
    if (apiConfig.mode === "live" && dbMessages) {
      const mapped = dbMessages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
        thinkingTime: m.latencyMs ? parseFloat((m.latencyMs / 1000).toFixed(2)) : undefined,
        thinkingSteps: m.role === "assistant" ? ["Loaded from database", `Model: ${m.modelId}`, `Provider: ${m.provider}`] : undefined,
        sources: []
      }));
      setMessages(mapped);
    }
  }, [dbMessages, apiConfig.mode]);

  // Save API config to localStorage helper
  const handleApiConfigChange = (key: string, value: string) => {
    const updated = { ...apiConfig, [key]: value };
    dispatch(updateConfig({ [key]: value }));
    localStorage.setItem("agent_api_config", JSON.stringify(updated));
  };

  // --- Add/Update Search History ---
  const recordSearchQuery = (queryText: string) => {
    if (!queryText.trim()) return;
    const trimmed = queryText.trim();
    
    setSearchHistory(prev => {
      const existing = prev.find(item => item.query.toLowerCase() === trimmed.toLowerCase());
      let updated: SearchHistoryItem[];
      
      if (existing) {
        updated = prev.map(item => 
          item.query.toLowerCase() === trimmed.toLowerCase()
            ? { ...item, count: item.count + 1, lastSearched: "Just now" }
            : item
        );
      } else {
        updated = [
          { query: trimmed, count: 1, lastSearched: "Just now" },
          ...prev
        ];
      }
      
      // Sort by frequency (count) descending
      const sorted = [...updated].sort((a, b) => b.count - a.count);
      localStorage.setItem("agent_search_history", JSON.stringify(sorted));
      return sorted;
    });
  };

  // Delete search item from history
  const deleteHistoryItem = (e: React.MouseEvent, queryText: string) => {
    e.stopPropagation();
    setSearchHistory(prev => {
      const updated = prev.filter(item => item.query !== queryText);
      localStorage.setItem("agent_search_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all history
  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("agent_search_history");
  };

  // --- Toggle Engine Helper ---
  const toggleEngine = (engine: string) => {
    if (selectedEngines.includes(engine)) {
      if (selectedEngines.length > 1) {
        setSelectedEngines(selectedEngines.filter(e => e !== engine));
      }
    } else {
      setSelectedEngines([...selectedEngines, engine]);
    }
  };

  // --- Copy message content ---
  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Model configuration mapper helper ---
  const mapModelToProviderAndId = (selectedModel: string): { provider: string; modelId: string } => {
    if (selectedModel.includes(":")) {
      const idx = selectedModel.indexOf(":");
      const provider = selectedModel.substring(0, idx);
      const modelId = selectedModel.substring(idx + 1);
      return { provider, modelId };
    }
    switch (selectedModel) {
      case "Gemini 1.5 Pro":
      case "gemini-1.5-pro":
        return { provider: "gemini", modelId: "gemini-1.5-pro" };
      case "DeepSeek R1":
        return { provider: "openrouter", modelId: "deepseek/deepseek-r1" };
      case "Claude 3.5 Sonnet":
        return { provider: "openrouter", modelId: "anthropic/claude-3.5-sonnet" };
      case "GPT-4o":
        return { provider: "openrouter", modelId: "openai/gpt-4o" };
      default:
        return { provider: "gemini", modelId: "gemini-1.5-flash" };
    }
  };

  const handleNewSession = () => {
    setSelectedSessionId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `### Welcome to **AGENTS.AI** — Multi-Engine Search Aggregator

I am your active **${agentConfig.name}**, initialized with **${agentConfig.model}**.

I can crawl, aggregate, and analyze complex information from multiple search engines, dev blogs, academic libraries, and codebases in parallel.

**Here is what you can do:**
* Ask me a complex question or search query.
* Customize my instructions and system prompt in the **Agent Panel** on the right.
* Check your search metrics and history count in the **History Analyzer** on the left.
* Toggle **Deep Research** mode to run multi-step sub-agent logic.

*What should we research today?*`,
        timestamp: new Date()
      }
    ]);
  };

  const handleCreateSession = async () => {
    try {
      const { provider, modelId } = mapModelToProviderAndId(agentConfig.model);
      const newSess = await createSession({
        title: "New Research Session",
        provider,
        modelId
      }).unwrap();
      setSelectedSessionId(newSess.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  // --- Run search query ---
  const handleSearchSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || isGenerating) return;

    // Reset input box
    setQuery("");

    // 1. Record search term frequency
    recordSearchQuery(activeQuery);

    // 2. Add user message
    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      role: "user",
      content: activeQuery,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    // 3. Create simulated thinking/searching placeholder message
    const agentMsgId = `agent-${Date.now()}`;
    const agentMessagePlaceholder: Message = {
      id: agentMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isSearching: true,
      thinkingSteps: ["Initializing Web Agent connection...", "Verifying search weights..."],
      sources: []
    };

    setMessages(prev => [...prev, agentMessagePlaceholder]);

    // Live mode backend call
    if (apiConfig.mode === "live") {
      try {
        const { provider, modelId } = mapModelToProviderAndId(agentConfig.model);
        
        // Map messages to ChatMessage format (only role and content)
        const pastMessages = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        
        const apiMessages = [...pastMessages, { role: "user" as const, content: activeQuery }];

        // Call backend chat API
        const response = await sendChatMessage({
          messages: apiMessages,
          provider,
          modelId,
          sessionId: selectedSessionId || undefined,
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
          systemPrompt: agentConfig.systemPrompt
        }).unwrap();

        // Update selected sessionId if backend returned one (user was authenticated and it created/used a session)
        if (response.sessionId) {
          setSelectedSessionId(response.sessionId);
        }

        // Update messages with backend response
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content: response.content,
                  isSearching: false,
                  thinkingTime: response.latencyMs ? parseFloat((response.latencyMs / 1000).toFixed(2)) : undefined,
                  thinkingSteps: [
                    "API Call Succeeded",
                    `Provider: ${response.provider}`,
                    `Model: ${response.modelId}`,
                  ],
                }
              : m
          )
        );
      } catch (err: any) {
        console.error(err);
        const errorMessage = err?.data?.message || err?.message || "An error occurred while connecting to the model or search engines. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content: `### Connection Error\n${errorMessage}`,
                  isSearching: false,
                }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Simulate Agent execution flow (Mock Mode)
    let steps: string[] = [];
    const updateSteps = (newStep: string) => {
      steps = [...steps, newStep];
      setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, thinkingSteps: steps } : m));
    };

    try {
      // Step 1: Query expansion
      await new Promise(resolve => setTimeout(resolve, 800));
      updateSteps(`Analyzing intent and expanding query tokens: ["${activeQuery}"]`);

      // Step 2: Engine Querying based on state
      await new Promise(resolve => setTimeout(resolve, 1000));
      const activeEngs = selectedEngines.map(e => e.toUpperCase()).join(", ");
      updateSteps(`Querying engine indexers: [${activeEngs}] (Deep Research: ${deepResearch ? "ON (Depth 3)" : "OFF"})`);

      // Step 3: Web crawler simulated results
      await new Promise(resolve => setTimeout(resolve, 1200));
      updateSteps("Retrieved 6 result schemas. Extracting high-relevance chunks...");
      
      const mockSources: Source[] = getMockSources(activeQuery);
      setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, sources: mockSources } : m));

      // Step 4: Markdown composition
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateSteps("Synthesizing comparative results and resolving conflicting data...");

      // Final response synthesis
      await new Promise(resolve => setTimeout(resolve, 800));
      const simulatedResponseText = getSimulatedResponse(activeQuery, agentConfig, deepResearch);

      setMessages(prev => prev.map(m => 
        m.id === agentMsgId 
          ? { 
              ...m, 
              content: simulatedResponseText, 
              isSearching: false,
              thinkingTime: deepResearch ? 4.8 : 2.5
            } 
          : m
      ));
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(m => 
        m.id === agentMsgId 
          ? { 
              ...m, 
              content: "### Error running query\nAn error occurred while connecting to the model or search engines. Please try again.", 
              isSearching: false 
            } 
          : m
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Collapsible Thinking Steps State ---
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const toggleThinking = (id: string) => {
    setExpandedThinking(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      
      {/* ================= LEFT SIDEBAR: Search Analytics & History ================= */}
      <aside 
        className={cn(
          "w-80 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl flex flex-col h-full shrink-0 transition-all duration-300 z-30 absolute md:relative",
          sidebarOpen ? "left-0" : "-left-80 md:-ml-80"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-600/10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none tracking-tight bg-gradient-to-r from-indigo-950 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                AGENTS.AI
              </h1>
              <span className="text-[10px] text-indigo-600/90 font-mono tracking-wider font-semibold">AGGREGATOR PLATFORM</span>
            </div>
          </div>
          
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex px-3 pt-2.5 border-b border-slate-200/50 gap-1 shrink-0 bg-slate-50/50">
          <button
            onClick={() => setSidebarTab("analytics")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-t-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-205 border-t border-x",
              sidebarTab === "analytics"
                ? "bg-white border-slate-200 text-indigo-650 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-705 hover:bg-slate-100/50"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Analytics
          </button>
          <button
            onClick={() => setSidebarTab("files")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-t-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-205 border-t border-x",
              sidebarTab === "files"
                ? "bg-white border-slate-200 text-indigo-650 shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-705 hover:bg-slate-100/50"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Files & Audio
          </button>
        </div>

        {sidebarTab === "analytics" ? (
          <>
            {/* New Session Action */}
            <div className="p-3 shrink-0">
              <button 
                onClick={handleNewSession}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 text-xs font-semibold text-indigo-600 transition-all duration-205"
              >
                <Plus className="h-4 w-4" />
                New Research Session
              </button>
            </div>

            {/* SEARCH METRICS / FREQUENCY */}
            <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <History className="h-3 w-3 text-cyan-600" />
                    History Analyzer
                  </span>
                  {searchHistory.length > 0 && (
                    <button 
                      onClick={clearAllHistory}
                      className="text-[10px] text-red-500 hover:text-red-600 font-mono font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {searchHistory.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/50 text-center">
                    <p className="text-xs text-slate-400">No search records logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setQuery(item.query);
                          handleSearchSubmit(undefined, item.query);
                        }}
                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-100/80 border border-transparent hover:border-slate-200/60 cursor-pointer transition-all duration-150"
                      >
                        <div className="flex items-center gap-2 max-w-[80%]">
                          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-cyan-600 transition-colors" />
                          <span className="text-xs text-slate-655 truncate font-mono">
                            {item.query}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 border border-slate-200/60 text-cyan-600 shadow-sm shrink-0">
                            {item.count}x
                          </span>
                          <button 
                            onClick={(e) => deleteHistoryItem(e, item.query)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-all shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cloud Sessions list */}
              {apiConfig.mode === "live" && (
                <div className="mt-2 border-t border-slate-200/60 pt-3">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                      <Globe className="h-3 w-3 text-indigo-655 animate-pulse" />
                      Cloud Sessions
                    </span>
                    <button 
                      onClick={handleCreateSession}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-mono font-semibold"
                    >
                      + New
                    </button>
                  </div>
                  
                  {isLoadingSessions ? (
                    <div className="p-2 text-center text-xs text-slate-400">Loading sessions...</div>
                  ) : !dbSessions || dbSessions.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/50 text-center">
                      <p className="text-xs text-slate-400">
                        No sessions found. Start a conversation or hit + New.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {dbSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={cn(
                            "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 border text-left",
                            selectedSessionId === session.id
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold"
                              : "hover:bg-slate-100/80 border-transparent hover:border-slate-200/60 text-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2 max-w-[70%]">
                            <History className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-indigo-650" />
                            <span className="text-xs truncate font-sans">
                              {session.title}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newTitle = prompt("Rename session:", session.title);
                                if (newTitle) {
                                  await renameSession({ sessionId: session.id, title: newTitle });
                                }
                              }}
                              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-indigo-600"
                            >
                              <Sliders className="h-3 w-3" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Delete this session?")) {
                                  await deleteSession(session.id);
                                  if (selectedSessionId === session.id) {
                                    setSelectedSessionId(null);
                                  }
                                }
                              }}
                              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500"
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

              {/* Quick Stats Panel */}
              <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-3 space-y-2 mt-auto">
                <h3 className="text-xs font-bold text-slate-655 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Index Aggregation Metrics
                </h3>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded bg-white border border-slate-200/65 shadow-xs">
                    <div className="text-slate-400">Queries Routed</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      {searchHistory.reduce((acc, curr) => acc + curr.count, 0)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/65 shadow-xs">
                    <div className="text-slate-400">Unique Topics</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      {searchHistory.length}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/65 shadow-xs">
                    <div className="text-slate-400">Avg Response</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">2.44s</div>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/65 shadow-xs">
                    <div className="text-slate-400">Active Engines</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">{selectedEngines.length}/4</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
            {/* Audio Transcription Panel */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-3.5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <AudioLines className="h-4 w-4 text-cyan-600 animate-pulse" />
                Audio Transcription
              </h3>
              
              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-1">
                    Select Audio File
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer bg-white p-1.5 rounded-lg border border-slate-200"
                  />
                  {audioFile && (
                    <p className="text-[9px] text-slate-450 mt-1 truncate">
                      File: {audioFile.name} ({Math.round(audioFile.size / 1024)} KB)
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-1">
                      Provider
                    </label>
                    <select
                      value={transcribeProvider}
                      onChange={(e) => {
                        setTranscribeProvider(e.target.value);
                        if (e.target.value === "groq") setTranscribeModelId("whisper-large-v3");
                        else if (e.target.value === "gemini") setTranscribeModelId("gemini-1.5-flash");
                      }}
                      className="w-full text-[10px] py-1 px-1.5 rounded-md bg-white border border-slate-200 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="groq">Groq</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block mb-1">
                      Model ID
                    </label>
                    <input
                      type="text"
                      value={transcribeModelId}
                      onChange={(e) => setTranscribeModelId(e.target.value)}
                      className="w-full text-[10px] py-1 px-1.5 rounded-md bg-white border border-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!audioFile) {
                      alert("Please select an audio file first!");
                      return;
                    }
                    try {
                      setTranscriptionResult("Transcribing audio, please wait...");
                      const res = await transcribeAudio({
                        file: audioFile,
                        provider: transcribeProvider,
                        modelId: transcribeModelId,
                      }).unwrap();
                      setTranscriptionResult(res.text || "No text was transcribed.");
                    } catch (err: any) {
                      setTranscriptionResult(`Error: ${err.data?.message || err.message}`);
                    }
                  }}
                  disabled={isTranscribing || !audioFile}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-750 disabled:bg-slate-200 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Transcribe Audio"
                  )}
                </button>

                {transcriptionResult && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Result:</span>
                      <button
                        onClick={() => {
                          setQuery(transcriptionResult);
                          setSidebarTab("analytics");
                        }}
                        className="text-[9px] text-cyan-650 hover:underline font-bold"
                      >
                        Copy to input
                      </button>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200 text-[10px] text-slate-700 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap select-text leading-relaxed">
                      {transcriptionResult}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File Management Panel */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <FolderOpen className="h-4 w-4 text-indigo-500" />
                  Files Gateway
                </h3>
                <select
                  value={fileGatewayProvider}
                  onChange={(e) => setFileGatewayProvider(e.target.value)}
                  className="text-[9px] py-0.5 px-1 bg-white border border-slate-200 rounded font-bold text-slate-655"
                >
                  <option value="groq">Groq</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>

              <div className="space-y-2.5 text-[11px]">
                {/* Upload Section */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block">
                    Upload Dataset
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="file"
                      onChange={(e) => setUploadingFile(e.target.files?.[0] || null)}
                      className="flex-1 text-[10px] text-slate-550 file:mr-2 file:py-1 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 bg-white p-1 rounded border border-slate-200"
                    />
                    <select
                      value={filePurpose}
                      onChange={(e) => setFilePurpose(e.target.value)}
                      className="text-[9px] py-1 px-1 bg-white border border-slate-200 rounded font-semibold text-slate-700"
                    >
                      <option value="batch">batch</option>
                      <option value="fine-tune">fine-tune</option>
                    </select>
                  </div>

                  <button
                    onClick={async () => {
                      if (!uploadingFile) {
                        alert("Please select a file to upload!");
                        return;
                      }
                      try {
                        await uploadFileMutation({
                          file: uploadingFile,
                          purpose: filePurpose,
                          provider: fileGatewayProvider,
                        }).unwrap();
                        alert("File uploaded successfully!");
                        setUploadingFile(null);
                        refetchFiles();
                      } catch (err: any) {
                        alert(`Upload failed: ${err.data?.message || err.message}`);
                      }
                    }}
                    disabled={isUploadingFile || !uploadingFile}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    {isUploadingFile ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload to Gateway"
                    )}
                  </button>
                </div>

                {/* Files List */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">
                      Uploaded Files
                    </span>
                    <button
                      onClick={() => refetchFiles()}
                      className="text-[9px] text-indigo-650 hover:underline font-bold"
                    >
                      Refresh
                    </button>
                  </div>

                  {!filesData || !filesData.data || filesData.data.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 bg-white border border-slate-200/50 rounded-lg">
                      No files found on this provider.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {filesData.data.map((file) => (
                        <div
                          key={file.id}
                          className="p-1.5 rounded bg-white border border-slate-200/70 flex items-center justify-between text-[10px] text-slate-700"
                        >
                          <div className="truncate max-w-[65%] space-y-0.5">
                            <p className="font-semibold text-slate-800 truncate" title={file.filename}>
                              {file.filename}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              ID: {file.id}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                try {
                                  const details = await lazyRetrieveFile({
                                    fileId: file.id,
                                    provider: fileGatewayProvider,
                                  }).unwrap();
                                  alert(JSON.stringify(details, null, 2));
                                } catch (err: any) {
                                  alert(`Retrieve failed: ${err.data?.message || err.message}`);
                                }
                              }}
                              title="File Info"
                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                            >
                              <Info className="h-3 w-3" />
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  const blob = await lazyDownloadContent({
                                    fileId: file.id,
                                    provider: fileGatewayProvider,
                                  }).unwrap();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = file.filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  window.URL.revokeObjectURL(url);
                                } catch (err: any) {
                                  alert(`Download failed: ${err.data?.message || err.message}`);
                                }
                              }}
                              title="Download Content"
                              className="p-1 hover:bg-slate-100 rounded text-indigo-650"
                            >
                              <Download className="h-3 w-3" />
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
        )}

        {/* API Local Credentials Connection Drawer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1 font-mono">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              ENDPOINT CONFIG
            </span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border",
              apiConfig.mode === "live" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {apiConfig.mode === "live" ? "LIVE API" : "SANDBOX"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <button
                onClick={() => handleApiConfigChange("mode", "mock")}
                className={cn(
                  "flex-1 text-[10px] py-1 rounded font-bold text-center border transition-all",
                  apiConfig.mode === "mock" 
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                )}
              >
                Sandbox Mode
              </button>
              <button
                onClick={() => handleApiConfigChange("mode", "live")}
                className={cn(
                  "flex-1 text-[10px] py-1 rounded font-bold text-center border transition-all",
                  apiConfig.mode === "live" 
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                )}
              >
                Live URL
              </button>
            </div>

            {apiConfig.mode === "live" && (
              <div className="space-y-1.5 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Base URL: http://localhost:5000/v1"
                  value={apiConfig.baseUrl}
                  onChange={(e) => handleApiConfigChange("baseUrl", e.target.value)}
                  className="w-full text-[10px] py-1 px-2 rounded bg-white border border-slate-200 focus:outline-none focus:border-slate-350 text-slate-700 font-mono shadow-xs"
                />
                <input
                  type="password"
                  placeholder="Bearer Token / Authorization API Key"
                  value={apiConfig.apiKey}
                  onChange={(e) => handleApiConfigChange("apiKey", e.target.value)}
                  className="w-full text-[10px] py-1 px-2 rounded bg-white border border-slate-200 focus:outline-none focus:border-slate-350 text-slate-700 font-mono shadow-xs"
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 z-20 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ================= CENTER PANEL: Chat Playground Area ================= */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
        
        {/* Header Controls */}
        <header className="h-14 border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0 bg-white/70 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200/80 text-slate-600 shrink-0"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="text-xs font-semibold text-slate-655">
                Agent Active: <span className="text-indigo-650 font-bold">{agentConfig.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Engine Selector */}
            <div className="hidden lg:flex items-center bg-slate-100 border border-slate-200/80 rounded-lg p-0.5 shadow-xs">
              <button 
                onClick={() => toggleEngine("web")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                  selectedEngines.includes("web") ? "bg-white text-cyan-600 border border-slate-200/60 shadow-xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Globe className="h-3 w-3" />
                Web Search
              </button>
              <button 
                onClick={() => toggleEngine("code")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                  selectedEngines.includes("code") ? "bg-white text-cyan-600 border border-slate-200/60 shadow-xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Code className="h-3 w-3" />
                Codebase
              </button>
              <button 
                onClick={() => toggleEngine("academic")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all",
                  selectedEngines.includes("academic") ? "bg-white text-cyan-600 border border-slate-200/60 shadow-xs" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <BookOpen className="h-3 w-3" />
                Academic
              </button>
            </div>

            <button 
              onClick={() => setMessages(prev => prev.slice(0, 1))}
              className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold transition-colors shadow-xs bg-white"
            >
              Clear Conversation
            </button>

            <button 
              onClick={() => setConfigOpen(!configOpen)}
              className={cn(
                "p-1.5 rounded-lg border border-slate-200 transition-colors shrink-0",
                configOpen ? "bg-indigo-50 text-indigo-650 border-indigo-200" : "hover:bg-slate-100 text-slate-500 bg-white shadow-xs"
              )}
            >
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-4 max-w-4xl mx-auto items-start",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar Icon */}
              <div className={cn(
                "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs shadow-xs",
                msg.role === "user" 
                  ? "bg-slate-200 text-slate-700 border border-slate-300" 
                  : "bg-indigo-600 text-white shadow-indigo-600/10"
              )}>
                {msg.role === "user" ? "U" : "A"}
              </div>

              {/* Message Content Container */}
              <div className="flex-1 space-y-2 max-w-[85%] sm:max-w-[80%]">
                {/* User Message Header */}
                <div className="flex items-center gap-2 justify-between">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">
                    {msg.role === "user" ? "User Request" : agentConfig.model}
                  </span>
                  
                  {msg.role === "assistant" && msg.thinkingTime && (
                    <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Thought for {msg.thinkingTime}s
                    </span>
                  )}
                </div>

                {/* Main Message Card */}
                <div className={cn(
                  "p-4 rounded-xl text-sm leading-relaxed border transition-all duration-200 shadow-xs",
                  msg.role === "user" 
                    ? "bg-indigo-50/60 border-indigo-100 text-indigo-950" 
                    : "bg-white border-slate-200/80 text-slate-800"
                )}>
                  {/* Thinking steps drawer (If Assistant and has thinking steps) */}
                  {msg.role === "assistant" && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                    <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                      <button 
                        onClick={() => toggleThinking(msg.id)}
                        className="w-full flex items-center justify-between text-xs text-indigo-600 font-bold hover:text-indigo-700"
                      >
                        <span className="flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
                          {msg.isSearching ? "Active Agent Logic Running..." : "Execution Thought Process"}
                        </span>
                        {expandedThinking[msg.id] ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                      </button>

                      {(expandedThinking[msg.id] !== false || msg.isSearching) && (
                        <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 animate-fadeIn">
                          {msg.thinkingSteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-1.5 font-mono text-[11px] text-slate-500">
                              <span className="text-cyan-600 shrink-0 select-none">&gt;</span>
                              <span>{step}</span>
                            </div>
                          ))}
                          {msg.isSearching && (
                            <div className="flex items-center gap-2 font-mono text-[11px] text-indigo-600 pl-3.5 mt-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Compiling aggregator data...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cited Sources Carousel (Horizontal scroll) */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono flex items-center gap-1">
                        <Link className="h-3 w-3 text-cyan-600" /> CRAWLED SOURCES ({msg.sources.length})
                      </span>
                      
                      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                        {msg.sources.map((src, sIdx) => (
                          <div 
                            key={sIdx}
                            className="w-56 shrink-0 p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100/50 transition-all flex flex-col justify-between group shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 justify-between">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-200/60 border border-slate-300 text-indigo-700 font-mono">
                                  {src.domain}
                                </span>
                                <a 
                                  href={src.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-slate-400 hover:text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <h4 className="text-[11px] font-bold text-slate-800 mt-1.5 line-clamp-1 group-hover:text-indigo-650 transition-colors">
                                {src.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-sans">
                                {src.snippet}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Markdown Parsed Message Content */}
                  <div className="space-y-3 font-sans prose prose-invert max-w-none text-slate-800">
                    {parseMarkdown(msg.content)}
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="flex items-center gap-2.5 px-1">
                  <button 
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-655 transition-colors flex items-center gap-1 text-[11px] font-mono font-bold"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>

                  {msg.role === "assistant" && !msg.isSearching && (
                    <button 
                      onClick={() => handleSearchSubmit(undefined, messages[messages.indexOf(msg) - 1]?.content || "")}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-655 transition-colors flex items-center gap-1 text-[11px] font-mono font-bold"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Dummy element to auto-scroll */}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Form Query Input */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-md shrink-0">
          <form 
            onSubmit={handleSearchSubmit}
            className="max-w-4xl mx-auto rounded-xl border border-slate-200 bg-white p-2 space-y-2 shadow-sm focus-within:border-indigo-500/50 transition-all duration-200"
          >
            <div className="flex items-start gap-2">
              <Search className="h-5 w-5 text-slate-400 mt-2 ml-2 shrink-0" />
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
                placeholder="Ask active agent to research a topic or write script..."
                className="flex-1 w-full bg-transparent border-0 p-1.5 focus:ring-0 focus:outline-none text-sm text-slate-800 placeholder-slate-400 resize-none min-h-[40px] max-h-[160px] font-sans"
              />
              
              <button
                type="submit"
                disabled={!query.trim() || isGenerating}
                className={cn(
                  "p-2 rounded-lg transition-all shrink-0 mt-1 mr-1",
                  query.trim() && !isGenerating
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-650/10"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                )}
              >
                {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            {/* Input Footer Controls */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 px-1 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Deep Research Switcher */}
                <button
                  type="button"
                  onClick={() => setDeepResearch(!deepResearch)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold border transition-all duration-200 select-none",
                    deepResearch
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <Flame className={cn("h-3.5 w-3.5", deepResearch ? "text-indigo-600" : "text-slate-400")} />
                  Deep Research Mode
                </button>

                {/* Tools Info Tag */}
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-50 border border-slate-200/80 text-slate-500">
                  <Terminal className="h-3 w-3 text-cyan-600" />
                  Active Tools: {Object.entries(agentConfig.tools).filter(([_, active]) => active).map(([name]) => name).join(", ") || "none"}
                </span>
              </div>

              {/* Status */}
              <div className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1.5">
                <span>Engines: {selectedEngines.length} selected</span>
                <span>•</span>
                <span className="text-slate-500 uppercase tracking-widest text-[9px] font-semibold">{apiConfig.mode} active</span>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* ================= RIGHT PANEL: Agent Configuration ================= */}
      <aside 
        className={cn(
          "w-80 border-l border-slate-200/80 bg-white/90 backdrop-blur-xl flex flex-col h-full shrink-0 transition-all duration-300 z-30 absolute md:relative right-0",
          configOpen ? "right-0" : "-right-80 md:-mr-80"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-indigo-650" />
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              Agent Settings
            </h2>
          </div>
          <button 
            onClick={() => setConfigOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Configuration Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Agent Persona Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Agent Identity Name
            </label>
            <input 
              type="text" 
              value={agentConfig.name}
              onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
              className="w-full text-xs py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500/50 shadow-xs"
            />
          </div>

          {/* Base Reasoning Model Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Base Reasoning Model
            </label>
            <select
              value={agentConfig.model}
              onChange={(e) => setAgentConfig({ ...agentConfig, model: e.target.value })}
              className="w-full text-xs py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500/50 shadow-xs font-medium"
            >
              <optgroup label="Groq Cloud (Ultra-Fast)">
                <option value="groq:llama3-8b-8192">Llama 3 8B (llama3-8b-8192)</option>
                <option value="groq:llama-3.1-70b-versatile">Llama 3.1 70B (llama-3.1-70b-versatile)</option>
                <option value="groq:mixtral-8x7b-32768">Mixtral 8x7B (mixtral-8x7b-32768)</option>
                <option value="groq:gemma2-9b-it">Gemma 2 9B (gemma2-9b-it)</option>
              </optgroup>
              <optgroup label="OpenRouter (OpenAI, DeepSeek, Claude)">
                <option value="openrouter:deepseek/deepseek-r1">DeepSeek R1 (deepseek/deepseek-r1)</option>
                <option value="openrouter:openai/gpt-4o">OpenAI GPT-4o (openai/gpt-4o)</option>
                <option value="openrouter:openai/gpt-4o-mini">OpenAI GPT-4o Mini (openai/gpt-4o-mini)</option>
                <option value="openrouter:anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)</option>
              </optgroup>
              <optgroup label="Google Gemini (Native)">
                <option value="gemini:gemini-1.5-flash">Gemini 1.5 Flash (gemini-1.5-flash)</option>
                <option value="gemini:gemini-1.5-pro">Gemini 1.5 Pro (gemini-1.5-pro)</option>
              </optgroup>
            </select>
          </div>

          {/* System prompt instruct */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                System Instructions
              </label>
              <button 
                onClick={() => setAgentConfig({
                  ...agentConfig,
                  systemPrompt: "You are an advanced search agent designed to crawl multiple index providers, compare documentation, extract key takeaways, and synthesize high-fidelity insights. Cite all sources."
                })}
                className="text-[9px] text-indigo-650 hover:text-indigo-700 font-bold"
              >
                Reset Default
              </button>
            </div>
            <textarea
              rows={4}
              value={agentConfig.systemPrompt}
              onChange={(e) => setAgentConfig({ ...agentConfig, systemPrompt: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-indigo-500/50 resize-none font-sans leading-relaxed shadow-xs"
            />
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-500">
                <span className="uppercase tracking-wider">Temperature</span>
                <span className="text-indigo-650">{agentConfig.temperature}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.05"
                value={agentConfig.temperature}
                onChange={(e) => setAgentConfig({ ...agentConfig, temperature: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[9px] text-slate-400 block font-sans">Lower temperature results in more focused answers.</span>
            </div>

            {/* Max response length */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-500">
                <span className="uppercase tracking-wider">Max Token Buffer</span>
                <span className="text-indigo-650">{agentConfig.maxTokens}</span>
              </div>
              <input 
                type="range" 
                min="512" 
                max="8192" 
                step="256"
                value={agentConfig.maxTokens}
                onChange={(e) => setAgentConfig({ ...agentConfig, maxTokens: parseInt(e.target.value) })}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Tools Toggles */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
              Active Agent Tools
            </label>

            {/* Web search toggle */}
            <div 
              onClick={() => setAgentConfig({
                ...agentConfig,
                tools: { ...agentConfig.tools, webSearch: !agentConfig.tools.webSearch }
              })}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-cyan-600" />
                <span className="text-xs text-slate-700 font-semibold">Web Crawling Engine</span>
              </div>
              {agentConfig.tools.webSearch ? (
                <div className="h-4 w-7 bg-indigo-600 rounded-full p-0.5 flex justify-end transition-all">
                  <div className="h-3 w-3 bg-white rounded-full shadow-sm" />
                </div>
              ) : (
                <div className="h-4 w-7 bg-slate-200 rounded-full p-0.5 flex justify-start transition-all">
                  <div className="h-3 w-3 bg-slate-400 rounded-full shadow-sm" />
                </div>
              )}
            </div>

            {/* Code executor sandbox */}
            <div 
              onClick={() => setAgentConfig({
                ...agentConfig,
                tools: { ...agentConfig.tools, codeSandbox: !agentConfig.tools.codeSandbox }
              })}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs text-slate-700 font-semibold">Python/JS Sandbox</span>
              </div>
              {agentConfig.tools.codeSandbox ? (
                <div className="h-4 w-7 bg-indigo-600 rounded-full p-0.5 flex justify-end transition-all">
                  <div className="h-3 w-3 bg-white rounded-full shadow-sm" />
                </div>
              ) : (
                <div className="h-4 w-7 bg-slate-200 rounded-full p-0.5 flex justify-start transition-all">
                  <div className="h-3 w-3 bg-slate-400 rounded-full shadow-sm" />
                </div>
              )}
            </div>

            {/* Calculator tool */}
            <div 
              onClick={() => setAgentConfig({
                ...agentConfig,
                tools: { ...agentConfig.tools, calculator: !agentConfig.tools.calculator }
              })}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs text-slate-700 font-semibold">Math Solver</span>
              </div>
              {agentConfig.tools.calculator ? (
                <div className="h-4 w-7 bg-indigo-600 rounded-full p-0.5 flex justify-end transition-all">
                  <div className="h-3 w-3 bg-white rounded-full shadow-sm" />
                </div>
              ) : (
                <div className="h-4 w-7 bg-slate-200 rounded-full p-0.5 flex justify-start transition-all">
                  <div className="h-3 w-3 bg-slate-400 rounded-full shadow-sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel Footer Information */}
        <div className="p-3 border-t border-slate-200/80 text-[10px] text-slate-400 font-mono space-y-1">
          <div className="flex items-center gap-1 font-semibold">
            <Info className="h-3 w-3 text-indigo-500" />
            <span>Agent Workspace Session</span>
          </div>
          <div>Version: 1.0.4 Aggregator API</div>
          <div>React Router Status: Client Comp</div>
        </div>
      </aside>
    </div>
  );
}

// --- HELPER FUNCTIONS ---

// Simple markdown parsing helper
function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    // 1. Headings
    if (line.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-sm font-bold text-slate-900 mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1 font-sans">
          {line.replace("### ", "")}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-base font-bold text-slate-800 mt-5 mb-2.5 font-sans">
          {line.replace("## ", "")}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-lg font-extrabold text-indigo-700 mt-6 mb-3 font-sans">
          {line.replace("# ", "")}
        </h1>
      );
    }

    // 2. Code Block
    if (line.startsWith("```")) {
      return null;
    }

    // 3. Bullet points
    if (line.startsWith("* ") || line.startsWith("- ")) {
      const content = line.substring(2);
      return (
        <li key={idx} className="list-disc list-inside ml-2.5 text-xs text-slate-655 py-0.5">
          {boldFormatter(content)}
        </li>
      );
    }

    // 4. Standard paragraphs
    if (line.trim() === "") {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
        {boldFormatter(line)}
      </p>
    );
  });
}

// Simple bold formatter (**bold**)
function boldFormatter(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    // Every odd item in split is within the asterisks
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-extrabold text-slate-950">
          {part}
        </strong>
      );
    }
    return part;
  });
}

// Return mock cites based on search terms
function getMockSources(query: string): Source[] {
  const q = query.toLowerCase();
  
  if (q.includes("next")) {
    return [
      {
        title: "Next.js 16 Upgrade Guide and Breaking Changes",
        url: "https://nextjs.org/docs/app/building-your-application/upgrading",
        domain: "nextjs.org",
        snippet: "Detailed walkthrough of standard API changes, Node.js requirement updates, and router optimizations in Next.js 16."
      },
      {
        title: "Vercel Blog: Shipping Next.js 16 core builds",
        url: "https://vercel.com/blog/nextjs-16-announcement",
        domain: "vercel.com",
        snippet: "Introducing Turbopack by default, React 19 stable API alignment, and 3x faster client compilation speeds."
      },
      {
        title: "GitHub Issue #89291: Tailwind CSS v4 setup issues",
        url: "https://github.com/vercel/next.js/issues/89291",
        domain: "github.com",
        snippet: "Community threads tracking package dependencies, postcss imports, and inline CSS directive alignments."
      }
    ];
  }
  
  if (q.includes("deepseek") || q.includes("r1")) {
    return [
      {
        title: "DeepSeek-R1: Incentivizing Reasoning in LLMs",
        url: "https://github.com/deepseek-ai/DeepSeek-R1",
        domain: "github.com/deepseek-ai",
        snippet: "Repository hosting weights, system parameters, and model specifications for the open-source reasoning model."
      },
      {
        title: "Comparing Reasoning architectures: DeepSeek-R1 vs OpenAI o1",
        url: "https://arxiv.org/abs/2501.99391",
        domain: "arxiv.org",
        snippet: "Academic review of Reinforcement Learning alignment patterns, reasoning tokens, and token throughput times."
      }
    ];
  }

  // Default sources
  return [
    {
      title: `Search Index: results for '${query}'`,
      url: "https://google.com",
      domain: "google.com",
      snippet: `Compiled references and articles matching tokens inside '${query}'.`
    },
    {
      title: "Wikipedia search indexer database",
      url: "https://wikipedia.org",
      domain: "wikipedia.org",
      snippet: "Reference archive page tracking background information relating to general terms."
    }
  ];
}

// Generate high fidelity responses
function getSimulatedResponse(query: string, config: AgentConfig, deepResearch: boolean): string {
  const q = query.toLowerCase();
  
  if (q.includes("next")) {
    return `# Next.js 16 Core Aggregation Analysis

Based on our multi-engine aggregation, here is the synthesis of core updates regarding **Next.js 16** and React 19 integration:

### 1. Key Framework Changes
* **React 19 Stable Support**: Next.js 16 App Router fully migrates to standard stable React 19 APIs (including Server Actions, ref passing as props, and preloading resource hints).
* **Turbopack Compiler**: Turbopack is now the default development bundler. Page hydration speeds are reported to be **35% faster** on cold starts.
* **Minimal Node.js version**: Required Node.js version has been bumped to **v20.8.0** or higher.

### 2. Common Tailwind CSS v4 Setup Guide
Tailwind v4 uses a **CSS-first configuration**. The old \`tailwind.config.js\` is ignored.
* Import Tailwind in your entry CSS file using: \`@import "tailwindcss";\`
* Use the new \`@theme\` directive in CSS to configure colors and custom utility classes.

### 3. Recommendation
If you are planning to upgrade from Next.js 15, ensure all custom plugins are compatible with React 19, and replace old router parameters (such as searchParams props which are now promises) with the \`await\` syntax.`;
  }
  
  if (q.includes("deepseek") || q.includes("r1")) {
    return `# DeepSeek-R1 Deep Analysis Report

Our search aggregator has retrieved documentation and performance charts regarding **DeepSeek-R1**:

### 1. Reasoning Architecture
* **Reinforcement Learning (RL)**: DeepSeek-R1 relies heavily on pure RL training without intermediate Supervised Fine-Tuning (SFT) in its initial stages, allowing the model to self-correct reasoning paths.
* **Reasoning Tokens**: The model outputs specialized tags (\`<think>...</think>\`) containing raw reasoning chains before composing the final markdown answer.

### 2. Key comparison: R1 vs OpenAI o1
* **Cost Efficiency**: DeepSeek-R1 is available at roughly **90% lower API costs** compared to proprietary frontier reasoning engines.
* **Open Weights**: Weights are open-sourced under the MIT license, enabling local execution on consumer hardware (specifically for distilled versions ranging from 1.5B to 70B parameters).

### 3. Aggregator Verdict
For applications requiring high-precision code generation, mathematical theorem proving, or recursive logical steps, **DeepSeek-R1** delivers state-of-the-art results comparable to proprietary models while offering full hosting flexibility.`;
  }

  // Default response
  return `# Search Synthesis: "${query}"

I have aggregated results across the selected sources using **${config.model}**.

### Summary of Findings
* **Aggregated Term**: "${query}"
* **Research Depth**: ${deepResearch ? "Deep multi-step research execution was completed successfully" : "Standard single-pass lookup completed"}
* **Active Agent Instructions**: I utilized the custom system prompt: *"Client instruction override: ${config.name}"*

### Synthesized Report
We searched multiple indexes for this topic. Standard consensus indicates this query relates to custom development configurations or general reference lookups. To get more specific reports, try searching for topics like **"Next.js 16 updates"** or **"DeepSeek R1 logic reasoning"**.

*You can change my instructions on the right to tailor my tone or focus areas.*`;
}
