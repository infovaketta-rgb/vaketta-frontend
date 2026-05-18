"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import type { FlowDefinition, FlowNode, FlowEdge, HotelContext, ApprovedTemplate } from "../types";

import StartNode             from "../nodes/StartNode";
import MessageNode           from "../nodes/MessageNode";
import QuestionNode          from "../nodes/QuestionNode";
import BranchNode            from "../nodes/BranchNode";
import ActionNode            from "../nodes/ActionNode";
import EndNode               from "../nodes/EndNode";
import CheckAvailabilityNode from "../nodes/CheckAvailabilityNode";
import ShowRoomsNode         from "../nodes/ShowRoomsNode";
import TimeConditionNode     from "../nodes/TimeConditionNode";
import JumpNode              from "../nodes/JumpNode";
import ShowMenuNode          from "../nodes/ShowMenuNode";
import SendTemplateNode      from "../nodes/SendTemplateNode";
import SendSavedReplyNode   from "../nodes/SendSavedReplyNode";
import DelayNode            from "../nodes/DelayNode";
import OptionsNode           from "../nodes/OptionsNode";
import DeletableEdge         from "../DeletableEdge";
import NodePalette, { SYSTEM_VARS } from "../NodePalette";
import CanvasToolbar         from "../CanvasToolbar";
import NodeInspectorPanel    from "../NodeInspectorPanel";
import FlowSimulator         from "../FlowSimulator";
import FlowVersionHistory    from "../FlowVersionHistory";
import ErrorBoundary         from "@/components/ErrorBoundary";

// ── Initial node defaults ─────────────────────────────────────────────────────

function defaultData(type: string): Record<string, unknown> {
  switch (type) {
    case "start":              return { label: "" };
    case "message":            return { text: "" };
    case "question":           return { text: "", questionType: "text", variableName: "", validation: "none", validationError: "" };
    case "branch":             return { conditions: [], defaultHandleId: "default" };
    case "action":             return { actionType: "create_booking", message: "" };
    case "end":                return { farewellText: "" };
    case "check_availability": return { roomTypeIdVar: "", checkInVar: "", checkOutVar: "", unavailableMessage: "" };
    case "show_rooms":         return { text: "", filter: "all", variableName: "room", validationError: "" };
    case "time_condition":     return { label: "" };
    case "jump":               return { targetNodeId: "", label: "" };
    case "show_menu":          return { label: "" };
    case "send_template":      return { templateId: "", templateName: "", variableMapping: {}, failureMessage: "" };
    case "send_saved_reply":   return { savedReplyId: null, savedReplyName: "", variableOverrides: {} };
    case "delay":              return { duration: 24, unit: "hours", resumeMessage: "" };
    case "options":            return { text: "", options: [], variableName: "selectedOption", validationError: "", useListMessage: false, listButtonLabel: "View Options", sectionTitle: "Options" };
    default:                   return {};
  }
}

let _nodeIdx = 1;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FlowCanvasPage() {
  const mounted   = useMounted();
  const params    = useParams();
  const flowId    = params["id"] as string;

  const [flow,              setFlow]              = useState<FlowDefinition | null>(null);
  const [flowName,          setFlowName]          = useState("");
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [publishing,        setPublishing]        = useState(false);
  const [error,             setError]             = useState("");
  const [hotelCtx,          setHotelCtx]          = useState<HotelContext | null>(null);
  const [approvedTemplates, setApprovedTemplates] = useState<ApprovedTemplate[]>([]);
  const [savedReplies,      setSavedReplies]      = useState<{ id: string; name: string; category: string | null; variables: string[] }[]>([]);
  const [showSimulator,     setShowSimulator]     = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);
  const [unsaved,           setUnsaved]           = useState(false);
  const [hasDraft,          setHasDraft]          = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selectedNode, setSelectedNode]  = useState<FlowNode | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const rfInstance       = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);

  // Refs used by the auto-save closure to avoid stale captures
  const nodesRef    = useRef(nodes);
  const edgesRef    = useRef(edges);
  const flowNameRef = useRef(flowName);
  useEffect(() => { nodesRef.current = nodes; },    [nodes]);
  useEffect(() => { edgesRef.current = edges; },    [edges]);
  useEffect(() => { flowNameRef.current = flowName; }, [flowName]);

  const initialLoadDone = useRef(false);
  const autoSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch flow + hotel context ────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      apiFetch(`/hotel-settings/flows/${flowId}`),
      apiFetch("/hotel-settings"),
      apiFetch("/room-types"),
      apiFetch("/hotel-templates?status=APPROVED").catch(() => []),
      apiFetch("/saved-replies").catch(() => []),
    ])
      .then(([data, settings, rooms, tpls, savedRepliesData]: [FlowDefinition & { draftVersionId?: string | null }, any, any[], any[], any[]]) => {
        setFlow(data);
        setFlowName(data.name);
        setNodes((data.nodes as FlowNode[]) ?? []);
        setEdges((data.edges as FlowEdge[]) ?? []);
        setHasDraft(!!data.draftVersionId);
        setHotelCtx({
          hotelId:        settings.id,
          hotelName:      settings.name,
          roomTypes:      rooms,
          bookingEnabled: settings.config?.bookingEnabled ?? true,
        });
        setSavedReplies(savedRepliesData ?? []);
        const varCount = (text: string) => (text.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g) ?? []).length;
        setApprovedTemplates(
          (tpls ?? []).map((t: any) => ({
            id:            t.id,
            name:          t.name,
            language:      t.language,
            variableCount: varCount(t.components?.body?.text ?? ""),
            components:    t.components,
          }))
        );
        initialLoadDone.current = true;
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mounted, flowId]);

  // ── Auto-save on canvas change (2 s debounce, silent) ────────────────────
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setUnsaved(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await apiFetch(`/hotel-settings/flows/${flowId}/draft`, {
          method: "POST",
          body: JSON.stringify({
            name:  flowNameRef.current,
            nodes: nodesRef.current,
            edges: edgesRef.current,
          }),
        });
        setUnsaved(false);
        setHasDraft(true);
      } catch { /* silent — user can manually save */ }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [nodes, edges, flowId]);

  const readOnly = flow?.isTemplate ?? false;

  // ── Node types memo ───────────────────────────────────────────────────────
  const nodeTypes = useMemo<NodeTypes>(() => ({
    start:              StartNode as any,
    message:            MessageNode as any,
    question:           QuestionNode as any,
    branch:             BranchNode as any,
    action:             ActionNode as any,
    end:                EndNode as any,
    check_availability: CheckAvailabilityNode as any,
    show_rooms:         ShowRoomsNode as any,
    time_condition:     TimeConditionNode as any,
    jump:               JumpNode as any,
    show_menu:          ShowMenuNode as any,
    send_template:      SendTemplateNode as any,
    send_saved_reply:   SendSavedReplyNode as any,
    delay:              DelayNode as any,
    options:            OptionsNode as any,
  }), []);

  // ── Edge types — DeletableEdge wraps default edge with a delete button ────
  const edgeTypes = useMemo<EdgeTypes>(
    () => (readOnly
      ? ({} as EdgeTypes)
      : { default: (props: any) => <DeletableEdge {...props} readOnly={false} /> }),
    [readOnly]
  );

  // ── Connect edges ─────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // ── Drop from palette ─────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!reactFlowWrapper.current) return;
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: e.clientX - bounds.left - 80,
        y: e.clientY - bounds.top  - 30,
      };
      const newNode: FlowNode = {
        id:   `node-${Date.now()}-${_nodeIdx++}`,
        type: type as any,
        position,
        data: defaultData(type) as any,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  // ── Update node data (from inspector) ────────────────────────────────────
  const updateNodeData = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: data as any } : n)));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: data as any } : prev);
  }, [setNodes]);

  // ── Delete node ───────────────────────────────────────────────────────────
  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // ── Add start node helper ─────────────────────────────────────────────────
  function addStartNode() {
    const id = `node-start-${Date.now()}`;
    setNodes((nds) => nds.concat({
      id, type: "start" as any, position: { x: 200, y: 60 }, data: { label: "" } as any,
    }));
  }

  // ── Save Draft ────────────────────────────────────────────────────────────
  async function handleSaveDraft() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/hotel-settings/flows/${flowId}/draft`, {
        method: "POST",
        body: JSON.stringify({ name: flowName, nodes, edges }),
      });
      setUnsaved(false);
      setHasDraft(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  async function handlePublish() {
    setPublishing(true);
    setError("");
    try {
      await apiFetch(`/hotel-settings/flows/${flowId}/publish`, { method: "POST" });
      setHasDraft(false);
      setUnsaved(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  }

  // ── After rollback: reload canvas from server ─────────────────────────────
  async function handleRollback() {
    try {
      const data = await apiFetch(`/hotel-settings/flows/${flowId}`);
      setNodes((data.nodes as FlowNode[]) ?? []);
      setEdges((data.edges as FlowEdge[]) ?? []);
      setHasDraft(true);
      setUnsaved(false);
    } catch { /* ignore */ }
    setShowHistory(false);
  }

  // ── Fit view ──────────────────────────────────────────────────────────────
  function handleFitView() {
    rfInstance.current?.fitView({ padding: 0.15, duration: 300 });
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (readOnly) return;
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing && selectedNode) {
        deleteNode(selectedNode.id);
        return;
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveDraft();
        return;
      }
      if (e.key === "Escape") {
        setSelectedNode(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readOnly, selectedNode, deleteNode]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-[#7A3F91]" />
      </div>
    );
  }

  if (error && !flow) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">{error}</div>
    );
  }

  const hasStart = nodes.some((n) => n.type === "start");

  const definedVars = Array.from(new Set([
    ...SYSTEM_VARS.map((sv) => sv.name),
    ...nodes
      .filter((n) => n.type === "question")
      .map((n) => (n.data as any).variableName as string)
      .filter(Boolean),
    ...nodes
      .filter((n) => n.type === "show_rooms")
      .flatMap((n) => {
        const p = (n.data as any).variableName as string;
        return p ? [`${p}TypeId`, `${p}TypeName`, `${p}Price`] : [];
      }),
    ...(nodes.some((n) => n.type === "show_rooms" || (n.type === "question" && (n.data as any).questionType === "room_selection"))
      ? ["bookingRoomTypeId", "bookingRoomTypeName", "bookingPricePerNight"] : []),
    ...(nodes.some((n) => n.type === "action" && (n.data as any).actionType === "create_booking")
      ? ["bookingRef", "bookingStatus", "bookingId"] : []),
    ...(nodes.some((n) => n.type === "check_availability")
      ? ["availabilityResult", "availabilityCount"] : []),
  ]));

  const rightPanel = showSimulator
    ? (
      <FlowSimulator
        nodes={nodes}
        edges={edges}
        hotelCtx={hotelCtx}
        showDraftLabel={unsaved || hasDraft}
        onClose={() => setShowSimulator(false)}
      />
    )
    : showHistory
    ? (
      <FlowVersionHistory
        flowId={flowId}
        onRollback={handleRollback}
        onClose={() => setShowHistory(false)}
      />
    )
    : (
      <NodeInspectorPanel
        node={selectedNode}
        readOnly={readOnly}
        hotelCtx={hotelCtx}
        definedVars={definedVars}
        approvedTemplates={approvedTemplates}
        savedReplies={savedReplies}
        onChange={updateNodeData}
        onDelete={deleteNode}
      />
    );

  return (
    <ErrorBoundary>
    <div className="flex h-full flex-col overflow-hidden">
      <CanvasToolbar
        name={flowName}
        saving={saving}
        readOnly={readOnly}
        isTemplate={flow?.isTemplate ?? false}
        backHref="/dashboard/bot"
        nodeCount={nodes.length}
        edgeCount={edges.length}
        showingTest={showSimulator}
        showingHistory={showHistory}
        unsaved={unsaved}
        hasDraft={hasDraft}
        publishing={publishing}
        onSave={handleSaveDraft}
        onPublish={handlePublish}
        onNameChange={setFlowName}
        onFitView={handleFitView}
        onTest={() => { setShowSimulator((v) => !v); setShowHistory(false); }}
        onHistory={() => { setShowHistory((v) => !v); setShowSimulator(false); }}
      />

      {readOnly && (
        <div className="shrink-0 bg-purple-50 px-4 py-2 text-center text-xs font-medium text-purple-700">
          This is a read-only global template. You can view but not edit it.
        </div>
      )}

      {error && (
        <div className="shrink-0 bg-red-50 px-4 py-2 text-center text-xs text-red-600">{error}</div>
      )}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {!readOnly && (
          <div className="flex min-h-0 flex-col gap-2">
            <NodePalette />
            {!hasStart && (
              <button
                onClick={addStartNode}
                className="w-44 rounded-lg border border-dashed border-green-300 py-2 text-xs font-medium text-green-600 transition hover:bg-green-50"
              >
                + Add Start
              </button>
            )}
          </div>
        )}

        <div ref={reactFlowWrapper} className="relative min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onDrop={readOnly ? undefined : onDrop}
            onDragOver={readOnly ? undefined : onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node as FlowNode)}
            onPaneClick={() => setSelectedNode(null)}
            onInit={(inst) => { rfInstance.current = inst; }}
            fitView
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={true}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>

          {/* Empty canvas overlay */}
          {nodes.length === 0 && !readOnly && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
              <span className="text-4xl opacity-30">⬡</span>
              <div className="text-center">
                <p className="text-sm font-medium">Canvas is empty</p>
                <p className="text-xs mt-1 opacity-70">Drag a node from the palette, or click "+ Add Start"</p>
              </div>
            </div>
          )}
        </div>

        {rightPanel}
      </div>
    </div>
    </ErrorBoundary>
  );
}
