"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { roomsQueries } from "@/shared/api";
import type { GenerationAspectRatioSelection } from "./generation-aspect-ratio";

export function useGenerationDraft() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] =
    useState<GenerationAspectRatioSelection>("SOURCE");
  const [styleCode, setStyleCode] = useState<string>();
  const [roomTypeId, setRoomTypeId] = useState<string>();
  const roomsQuery = useQuery(roomsQueries.catalog());
  const availableRoomTypeId =
    roomTypeId &&
    (!roomsQuery.data ||
      roomsQuery.data.items.some((room) => room.id === roomTypeId))
      ? roomTypeId
      : undefined;

  return {
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    styleCode,
    setStyleCode,
    roomTypeId,
    setRoomTypeId,
    roomsQuery,
    availableRoomTypeId,
  };
}

export type GenerationDraft = ReturnType<typeof useGenerationDraft>;
