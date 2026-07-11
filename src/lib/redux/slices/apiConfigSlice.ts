import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ApiConfigState {
  baseUrl: string;
  modelName: string;
  apiKey: string;
  mode: "mock" | "live";
}

const initialState: ApiConfigState = {
  baseUrl: "http://localhost:8000/api/v1",
  modelName: "gemini-1.5-flash",
  apiKey: "",
  mode: "live", // Start in live mode since we are connecting the backend
};

const apiConfigSlice = createSlice({
  name: "apiConfig",
  initialState,
  reducers: {
    setBaseUrl(state, action: PayloadAction<string>) {
      state.baseUrl = action.payload;
    },
    setModelName(state, action: PayloadAction<string>) {
      state.modelName = action.payload;
    },
    setApiKey(state, action: PayloadAction<string>) {
      state.apiKey = action.payload;
    },
    setMode(state, action: PayloadAction<"mock" | "live">) {
      state.mode = action.payload;
    },
    updateConfig(state, action: PayloadAction<Partial<ApiConfigState>>) {
      return { ...state, ...action.payload };
    },
  },
});

export const { setBaseUrl, setModelName, setApiKey, setMode, updateConfig } = apiConfigSlice.actions;
export default apiConfigSlice.reducer;
