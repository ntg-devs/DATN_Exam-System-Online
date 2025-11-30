// store/notificationSlice.ts
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  latest: [], // lưu 5 thông báo mới nhất
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    pushNotification: (state, action) => {
      state.latest.unshift(action.payload);
      // chỉ giữ 5 thông báo mới nhất
      if (state.latest.length > 5) state.latest = state.latest.slice(0, 5);
      state.unreadCount += 1;
    },
    markAllRead: (state) => {
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.latest = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  pushNotification,
  markAllRead,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
