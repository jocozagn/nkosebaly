'use client';
import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { WebSettings } from '@/utils/api/general/getSettings';

const initialState = {
    data: {} as WebSettings,
    fcmtoken: "",
    lastFetch: null
}

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setSettings: (state, action:PayloadAction<WebSettings>) => {
            state.data = action.payload
        },
        setFcmTokenData: (state, action: PayloadAction<string>) => {
            state.fcmtoken = action.payload
        },
        setSettingsLastFetch: (state, action) => {
            state.lastFetch = action.payload
        },
    },
});

export const { setFcmTokenData, setSettings, setSettingsLastFetch } = settingsSlice.actions;
export default settingsSlice.reducer;

export const dataSelector = (state: RootState) => state.settings

export const settingsSelector = createSelector(dataSelector, state => state)
export const settingsLastFetchSelector = createSelector(dataSelector, state => state.lastFetch)
