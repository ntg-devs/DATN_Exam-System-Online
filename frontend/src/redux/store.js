import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice.js";
import verifyReducer from "./slices/verifySlice.js";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // lưu ở localStorage

// Gộp reducer
const rootReducer = combineReducers({
  user: userReducer,
  verify: verifyReducer,
});

// Cấu hình redux-persist
const persistConfig = {
  key: "root",
  storage,
  version: 1,
};

// Bọc reducer với persist
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Tạo store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Tạo persistor
export const persistor = persistStore(store);
