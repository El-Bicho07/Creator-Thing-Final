"use client";

import { createContext, useContext } from "react";
import type { ChannelOverview } from "./api";

export const ChannelContext = createContext<{
  channelId: string;
  overview: ChannelOverview | null;
  refresh: () => void;
}>({ channelId: "", overview: null, refresh: () => {} });

export const useChannel = () => useContext(ChannelContext);
