"use client";

import React, { useState } from "react";
import {
  Camera,
  Clock,
  MapPin,
  Download,
  CheckCircle2,
  Circle,
  Video,
  Move,
  Film,
  ListFilter
} from "lucide-react";
import { ShotListData, ShotItem, Project } from "@/lib/types";
import { exportShotListToCSV, downloadFile } from "@/lib/export";

interface ShotListStageProps {
  data: ShotListData;
  project: Project;
  onUpdateShot?: (shotId: string, isCompleted: boolean) => void;
}

export function ShotListStage({ data, project, onUpdateShot }: ShotListStageProps) {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    data.shots.forEach((s) => {
      initial[s.id] = s.isCompleted || false;
    });
    return initial;
  });

  const toggleShot = (id: string) => {
    const nextState = !completedMap[id];
    setCompletedMap((prev) => ({ ...prev, [id]: nextState }));
    if (onUpdateShot) {
      onUpdateShot(id, nextState);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = exportShotListToCSV(project);
    const filename = `${project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_shot_list.csv`;
    downloadFile(csvContent, filename, "text/csv");
  };

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("all");
  const [filterType, setFilterType] = useState<string>("all");

  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const progressPercent = data.shots.length > 0 ? Math.round((completedCount / data.shots.length) * 100) : 0;

  // Unique shot types
  const shotTypes = Array.from(new Set(data.shots.map((s) => s.shotType)));

  // Filter shots
  const filteredShots = data.shots.filter((shot) => {
    const isDone = !!completedMap[shot.id];
    if (filterStatus === "completed" && !isDone) return false;
    if (filterStatus === "pending" && isDone) return false;
    if (filterType !== "all" && shot.shotType !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Camera className="h-4 w-4" />
            <span>Stage 6: Production Shot List</span>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Download CSV for Camera Team</span>
          </button>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Production-Ready Camera Shot List
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete technical camera directions, movements, locations, and dialogue cues.
          </p>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Film className="h-3.5 w-3.5 text-primary" /> Total Shots Required
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 flex items-baseline gap-2">
              <span>{data.totalShots} Shots</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({completedCount} filmed)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" /> Estimated Shoot Time
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {data.estimatedShootHours}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Locations / Sets
            </div>
            <div className="text-xs sm:text-sm font-semibold text-foreground mt-1.5 truncate">
              {data.locationSummary.join(", ")}
            </div>
          </div>
        </div>

        {/* Shooting Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Shooting Progress</span>
            <span className="text-primary font-bold">{progressPercent}% Filmed ({completedCount}/{data.shots.length})</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            All ({data.shots.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "pending"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Pending ({data.shots.length - completedCount})
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "completed"
                ? "bg-emerald-600 text-white"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Filmed ({completedCount})
          </button>
        </div>

        {/* Shot Type Dropdown */}
        <div className="flex items-center gap-2">
          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-input bg-background/60 px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Shot Types</option>
            {shotTypes.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DESKTOP & TABLET VIEW: Responsive HTML Table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="responsive-table-wrapper">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-12 text-center">Done</th>
                <th className="py-3 px-3 w-14 text-center">#</th>
                <th className="py-3 px-3 w-32">Scene</th>
                <th className="py-3 px-3 w-28">Type & Move</th>
                <th className="py-3 px-3 w-36">Location & Setup</th>
                <th className="py-3 px-4">Dialogue / VO Line</th>
                <th className="py-3 px-3 w-16 text-center">Dur.</th>
                <th className="py-3 px-4 w-48">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredShots.map((shot) => {
                const isDone = !!completedMap[shot.id];
                return (
                  <tr
                    key={shot.id}
                    onClick={() => toggleShot(shot.id)}
                    className={`cursor-pointer transition-colors ${
                      isDone
                        ? "bg-emerald-500/5 text-muted-foreground line-through opacity-75"
                        : "hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShot(shot.id);
                        }}
                        className="inline-flex items-center justify-center h-6 w-6 text-primary hover:scale-110 transition-transform"
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold font-mono">
                      {shot.shotNumber}
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-foreground">
                      {shot.scene}
                    </td>

                    <td className="py-3.5 px-3 space-y-1">
                      <span className="inline-block rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {shot.shotType}
                      </span>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Move className="h-2.5 w-2.5" />
                        <span>{shot.cameraMovement}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-muted-foreground text-[11px]">
                      {shot.locationSetup}
                    </td>

                    <td className="py-3.5 px-4 font-sans text-xs italic">
                      "{shot.dialogueVo}"
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-bold text-foreground">
                      {shot.duration}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {shot.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE VIEW (CRITICAL REQUIREMENT): Stacked Card List */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Tap any shot card to mark as completed</span>
          <span>{completedCount}/{data.shots.length} Filmed</span>
        </div>

        {filteredShots.map((shot) => {
          const isDone = !!completedMap[shot.id];

          return (
            <div
              key={shot.id}
              onClick={() => toggleShot(shot.id)}
              className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                isDone
                  ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                  : "border-border bg-card shadow-xs hover:border-primary/40"
              }`}
            >
              {/* Top Row: Shot #, Scene, Duration, Checkbox */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-xs font-bold text-primary font-mono">
                    #{shot.shotNumber}
                  </span>
                  <span className={`font-bold text-xs ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {shot.scene}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                    {shot.duration}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleShot(shot.id);
                    }}
                    className="p-1"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Badges: Shot Type & Camera Movement */}
              <div className="flex flex-wrap gap-1.5 my-2.5">
                <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  <span>{shot.shotType}</span>
                </span>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground flex items-center gap-1">
                  <Move className="h-3 w-3 text-muted-foreground" />
                  <span>{shot.cameraMovement}</span>
                </span>
              </div>

              {/* Spoken Dialogue Line */}
              <div className="rounded-lg bg-background/80 p-2.5 text-xs italic text-foreground border border-border/40 my-2">
                "{shot.dialogueVo}"
              </div>

              {/* Location & Director Notes */}
              <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
                <div>
                  <strong className="text-foreground">Setup: </strong>
                  <span>{shot.locationSetup}</span>
                </div>
                <div>
                  <strong className="text-foreground">Notes: </strong>
                  <span>{shot.notes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
