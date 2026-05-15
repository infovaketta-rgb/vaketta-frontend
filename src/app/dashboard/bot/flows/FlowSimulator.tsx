"use client";

import { Component, useMemo, useRef, useState } from "react";
import type { FlowNode, FlowEdge, HotelContext, BranchCondition } from "./types";

// ── Error boundary ────────────────────────────────────────────────────────────

interface EBState { hasError: boolean; error: Error | null }

class SimulatorErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex w-72 shrink-0 flex-col rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden p-4 gap-3">
          <p className="text-xs font-bold text-red-600">Simulator error</p>
          <p className="text-[11px] text-red-500 wrap-break-word">
            {this.state.error?.message ?? "Unknown error"}. Fix the node configuration and try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 transition self-start"
          >
            ↩ Reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MAX_HOPS = 30;

type LogEntry =
  | { kind: "bot";    text: string }
  | { kind: "user";   text: string }
  | { kind: "action"; text: string }
  | { kind: "info";   text: string }
  | { kind: "error";  text: string };

interface SimState {
  nodeId:      string | null;
  vars:        Record<string, string>;
  log:         LogEntry[];
  hops:        number;
  done:        boolean;
  awaitInput?: { varName: string; prompt: string };
  choices?:    { handleId: string; label: string }[];
}

function evalCondition(cond: BranchCondition, vars: Record<string, string>): boolean {
  const left  = vars[cond.variable] ?? "";
  const right = cond.compareValue.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  switch (cond.operator) {
    case "equals":      return left === right;
    case "not_equals":  return left !== right;
    case "contains":    return left.includes(right);
    case "starts_with": return left.startsWith(right);
    case "gt":          return parseFloat(left) > parseFloat(right);
    case "lt":          return parseFloat(left) < parseFloat(right);
    default:            return false;
  }
}

function interp(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function addLog(s: SimState, entry: LogEntry): SimState {
  return { ...s, log: [...s.log, entry] };
}

interface Props {
  nodes:          FlowNode[];
  edges:          FlowEdge[];
  hotelCtx:       HotelContext | null;
  showDraftLabel?: boolean;
  onClose:        () => void;
}

function FlowSimulatorPanel({ nodes, edges, hotelCtx, showDraftLabel, onClose }: Props) {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const adjMap  = useMemo(() => {
    const m = new Map<string, FlowEdge[]>();
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, []);
      m.get(e.source)!.push(e);
    }
    return m;
  }, [edges]);

  const startNode = useMemo(() => nodes.find((n) => n.type === "start"), [nodes]);

  const [sim,      setSim]      = useState<SimState>({ nodeId: null, vars: {}, log: [], hops: 0, done: false });
  const [inputVal, setInputVal] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  function firstTarget(nodeId: string, handleId?: string | null): string | null {
    const es = adjMap.get(nodeId) ?? [];
    const filtered = handleId != null
      ? es.filter((e) => (e.sourceHandle ?? null) === handleId)
      : es;
    return filtered.length > 0 ? filtered[0]!.target : null;
  }

  function processNode(state: SimState, nodeId: string): SimState {
    if (state.hops >= MAX_HOPS) {
      return addLog({ ...state, done: true }, { kind: "error", text: "⚠ MAX_HOPS reached — possible infinite loop." });
    }
    const node = nodeMap.get(nodeId);
    if (!node) {
      return addLog({ ...state, done: true }, { kind: "error", text: `Node "${nodeId}" not found in canvas.` });
    }

    let s: SimState = { ...state, nodeId, hops: state.hops + 1, choices: undefined, awaitInput: undefined };

    switch (node.type) {
      case "start": {
        s = addLog(s, { kind: "info", text: "▶ Flow started" });
        const next = firstTarget(nodeId);
        if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ Start has no output connection." });
        return processNode(s, next);
      }

      case "message": {
        const text = interp((node.data as any).text ?? "", s.vars);
        s = addLog(s, { kind: "bot", text: text || "(empty message)" });
        const next = firstTarget(nodeId);
        if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ No output connected." });
        return processNode(s, next);
      }

      case "question": {
        const text    = interp((node.data as any).text ?? "", s.vars);
        const varName = (node.data as any).variableName ?? "answer";
        s = addLog(s, { kind: "bot", text: text || "(empty question)" });
        return { ...s, awaitInput: { varName, prompt: `Answer stored as {{${varName}}}` } };
      }

      case "branch": {
        const conditions: BranchCondition[] = (node.data as any).conditions ?? [];
        const defaultHandle: string = (node.data as any).defaultHandleId ?? "default";
        for (const cond of conditions) {
          if (evalCondition(cond, s.vars)) {
            s = addLog(s, { kind: "info", text: `→ Matched: "${cond.label || `${cond.variable} ${cond.operator} ${cond.compareValue}`}"` });
            const next = firstTarget(nodeId, cond.id);
            if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ No connection from this branch." });
            return processNode(s, next);
          }
        }
        s = addLog(s, { kind: "info", text: "→ No condition matched — default path" });
        const defNext = firstTarget(nodeId, defaultHandle);
        if (!defNext) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ No default connection." });
        return processNode(s, defNext);
      }

      case "action": {
        const at  = (node.data as any).actionType ?? "unknown";
        const msg = (node.data as any).message ? interp((node.data as any).message, s.vars) : null;
        if (msg) s = addLog(s, { kind: "bot", text: msg });
        s = addLog(s, { kind: "action", text: `⚡ ${at}` });
        const next = firstTarget(nodeId);
        if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ End of flow." });
        return processNode(s, next);
      }

      case "end": {
        const farewell = (node.data as any).farewellText;
        if (farewell) s = addLog(s, { kind: "bot", text: interp(farewell, s.vars) });
        return addLog({ ...s, done: true }, { kind: "info", text: "⏹ Flow ended." });
      }

      case "check_availability": {
        s = addLog(s, { kind: "action", text: "📅 Check availability (simulated: available)" });
        s = { ...s, vars: { ...s.vars, availabilityResult: "available", availabilityCount: "3" } };
        const next = firstTarget(nodeId, "available");
        if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ No 'available' connection." });
        return processNode(s, next);
      }

      case "show_rooms": {
        const text    = interp((node.data as any).text ?? "", s.vars);
        const varName = (node.data as any).variableName ?? "room";
        if (text) s = addLog(s, { kind: "bot", text });
        const rooms = hotelCtx?.roomTypes ?? [];
        if (rooms.length > 0) {
          s = addLog(s, { kind: "bot", text: rooms.map((r, i) => `${i + 1}. ${r.name} — ₹${r.basePrice}/night`).join("\n") });
        } else {
          s = addLog(s, { kind: "bot", text: "(No room types configured)" });
        }
        return { ...s, awaitInput: { varName: `${varName}TypeId`, prompt: `Enter room selection → stored as {{${varName}TypeId}}` } };
      }

      case "show_menu": {
        s = addLog(s, { kind: "action", text: "📋 Hotel menu sent" });
        const next = firstTarget(nodeId);
        if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ End of flow." });
        return processNode(s, next);
      }

      case "time_condition": {
        return {
          ...s,
          choices: [
            { handleId: "business_hours", label: "🟢 Business hours" },
            { handleId: "after_hours",    label: "🟡 After hours"    },
            { handleId: "weekend",        label: "🔵 Weekend"        },
          ],
        };
      }

      case "jump": {
        const targetId = (node.data as any).targetNodeId ?? "";
        const label    = (node.data as any).label ?? "";
        s = addLog(s, { kind: "info", text: `↩ Jump${label ? ` (${label})` : ""} → ${targetId.slice(0, 12)}…` });
        if (!targetId) return addLog({ ...s, done: true }, { kind: "error", text: "Jump node has no target configured." });
        return processNode(s, targetId);
      }

      case "delay": {
        const dur  = (node.data as any).duration ?? 1;
        const unit = (node.data as any).unit ?? "hours";
        s = addLog(s, { kind: "action", text: `⏱ Delay ${dur} ${unit} (simulated — skipped)` });
        const next = firstTarget(nodeId);
        if (!next) return addLog({ ...s, done: true }, { kind: "info", text: "⏹ No output connected." });
        return processNode(s, next);
      }

      default:
        return addLog({ ...s, done: true }, { kind: "error", text: `Unknown node type: ${node.type}` });
    }
  }

  function handleStart() {
    if (!startNode) return;
    const initial: SimState = { nodeId: startNode.id, vars: {}, log: [], hops: 0, done: false };
    setSim(processNode(initial, startNode.id));
    setInputVal("");
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function handleSubmitInput() {
    if (!sim.awaitInput || !sim.nodeId) return;
    const { varName } = sim.awaitInput;
    const newVars = { ...sim.vars, [varName]: inputVal };
    let s: SimState = addLog({ ...sim, vars: newVars, awaitInput: undefined }, { kind: "user", text: inputVal });
    const next = firstTarget(sim.nodeId);
    if (!next) s = addLog({ ...s, done: true }, { kind: "info", text: "⏹ End of flow." });
    else s = processNode(s, next);
    setSim(s);
    setInputVal("");
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function handleChoice(handleId: string) {
    if (!sim.nodeId || !sim.choices) return;
    let s: SimState = addLog({ ...sim, choices: undefined }, { kind: "user", text: handleId });
    const next = firstTarget(sim.nodeId, handleId);
    if (!next) s = addLog({ ...s, done: true }, { kind: "info", text: "⏹ No connection from this choice." });
    else s = processNode(s, next);
    setSim(s);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function handleReset() {
    setSim({ nodeId: null, vars: {}, log: [], hops: 0, done: false });
    setInputVal("");
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Draft notice */}
      {showDraftLabel && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-3 py-1.5 text-center text-[10px] font-medium text-amber-700">
          Previewing draft (not yet published)
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        <p className="text-xs font-bold text-gray-700">🧪 Flow Simulator</p>
        <div className="flex items-center gap-1.5">
          {!startNode && (
            <span className="text-[10px] text-amber-600">No Start node</span>
          )}
          {sim.nodeId === null ? (
            <button
              disabled={!startNode}
              onClick={handleStart}
              className="rounded px-2 py-1 text-[11px] font-semibold bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-40"
            >
              ▶ Start
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="rounded px-2 py-1 text-[11px] font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            >
              ↩ Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded p-0.5 text-gray-400 hover:text-gray-600 text-sm leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 min-h-0 max-h-96">
        {sim.log.length === 0 && (
          <p className="text-center text-[11px] text-gray-400 py-6">
            {startNode ? "Press ▶ Start to simulate" : "Add a Start node to the canvas first"}
          </p>
        )}
        {sim.log.map((entry, i) => {
          if (entry.kind === "bot") {
            return (
              <div key={i} className="rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-2 text-[11px] text-purple-900 whitespace-pre-wrap">
                <span className="text-[9px] font-bold text-purple-400 block mb-0.5">BOT</span>
                {entry.text}
              </div>
            );
          }
          if (entry.kind === "user") {
            return (
              <div key={i} className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-700 text-right">
                <span className="text-[9px] font-bold text-gray-400 block mb-0.5">YOU</span>
                {entry.text}
              </div>
            );
          }
          if (entry.kind === "action") {
            return (
              <div key={i} className="rounded-lg bg-orange-50 border border-orange-100 px-2 py-1 text-[10px] text-orange-700">
                {entry.text}
              </div>
            );
          }
          if (entry.kind === "error") {
            return (
              <div key={i} className="rounded-lg bg-red-50 border border-red-100 px-2 py-1 text-[10px] text-red-700 font-medium">
                {entry.text}
              </div>
            );
          }
          return (
            <div key={i} className="text-[10px] text-gray-400 px-1">
              {entry.text}
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>

      {/* Input / choices */}
      {!sim.done && (sim.awaitInput || sim.choices) && (
        <div className="px-2 pb-2 pt-1 border-t border-gray-100 space-y-1.5 shrink-0">
          {sim.awaitInput && (
            <>
              <p className="text-[10px] text-gray-400 italic">{sim.awaitInput.prompt}</p>
              <div className="flex gap-1">
                <input
                  autoFocus
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitInput()}
                  placeholder="Type answer…"
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#7A3F91]"
                />
                <button
                  onClick={handleSubmitInput}
                  className="rounded bg-[#7A3F91] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#2B0D3E] transition"
                >
                  →
                </button>
              </div>
            </>
          )}
          {sim.choices && (
            <>
              <p className="text-[10px] text-gray-400 italic">Choose a path:</p>
              <div className="space-y-1">
                {sim.choices.map((c) => (
                  <button
                    key={c.handleId}
                    onClick={() => handleChoice(c.handleId)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-left text-[11px] text-gray-700 hover:bg-purple-50 hover:border-purple-200 transition"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Variables */}
      {Object.keys(sim.vars).length > 0 && (
        <div className="px-3 pb-2 pt-1.5 border-t border-gray-100 shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-1">Variables</p>
          <div className="space-y-0.5">
            {Object.entries(sim.vars).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1 text-[10px]">
                <code className="text-purple-600 font-mono shrink-0">{k}</code>
                <span className="text-gray-300">=</span>
                <span className="text-gray-600 truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlowSimulator(props: Props) {
  return (
    <SimulatorErrorBoundary>
      <FlowSimulatorPanel {...props} />
    </SimulatorErrorBoundary>
  );
}
