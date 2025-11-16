import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  verifyInfo: null,
  status: "idle", // idle | verifying | success | failed
  error: null,
};

const verifySlice = createSlice({
  name: "verify",
  initialState,
  reducers: {
    setVerifyInfo: (state, action) => {
      state.verifyInfo = {
        ...state.verifyInfo, 
        ...action.payload, 
      };
    },
    startVerify: (state) => {
      state.status = "verifying";
      state.error = null;
    },
    verifySuccess: (state) => {
      state.status = "success";
    },
    verifyFailed: (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    },
    clearVerify: (state) => {
      state.verifyInfo = null;
      state.status = "idle";
      state.error = null;
    },
  },
});

export const {
  setVerifyInfo,
  startVerify,
  verifySuccess,
  verifyFailed,
  clearVerify,
} = verifySlice.actions;

export default verifySlice.reducer;
