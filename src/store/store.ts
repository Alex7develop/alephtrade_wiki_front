import { configureStore } from '@reduxjs/toolkit';
import fsReducer from './fsSlice';

export const store = configureStore({
  reducer: {
    fs: fsReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


