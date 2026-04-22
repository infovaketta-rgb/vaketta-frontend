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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { apiFetch } from "@/lib/api";
import { useMounted } from "@/lib/useMounted";
import type { FlowDefinition, FlowNode, FlowEdge, HotelContext } from "../types";

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
import NodePalette, { SYSTEM_VARS } from "../NodePalette";
import CanvasToolbar         from "../CanvasToolbar";
import NodeInspectorPanel    from "../NodeInspectorPanel";
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
    default:                   return {};
  }
}

let _nodeIdx = 1;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FlowCanvasPage() {
  const mounted   = useMounted();
  const params    = useParams();
  const flowId    = params["id"] as string;

  const [flow,        setFlow]        = useState<FlowDefinition | null>(null);
  const [flowName,    setFlowName]    = useState("");
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [hotelCtx,    setHotelCtx]    = useState<HotelContext | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selectedNode, setSelectedNode]  = useState<FlowNode | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // ── Fetch flow + hotel context ────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      apiFetch(`/hotel-settings/flows/${flowId}`),
      apiFetch("/hotel-settings"),
      apiFetch("/room-types"),
    ])
      .then(([data, settings, rooms]: [FlowDefinition, any, any[]]) => {
        setFlow(data);
        setFlowName(data.name);
        setNodes((data.nodes as FlowNode[]) ?? []);
        setEdges((data.edges as FlowEdge[]) ?? []);
        setHotelCtx({
          hotelId:        settings.id,
          hotelName:      settings.name,
          roomTypes:      rooms,
          bookingEnabled: settings.config?.bookingEnabled ?? true,
        });
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mounted, flowId]);

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
  }), []);

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
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: data as any } : n))
    );
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

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/hotel-settings/flows/${flowId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: flowName, nodes, edges }),
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

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

  // Collect all variable names defined by question/show_rooms nodes for autocomplete.
  // System vars are always prepended so they appear first in every dropdown/chip row.
  const definedVars = Array.from(new Set([
    // system variables always available
    ...SYSTEM_VARS.map((sv) => sv.name),
    // question nodes → variableName
    ...nodes
      .filter((n) => n.type === "question")
      .map((n) => (n.data as any).variableName as string)
      .filter(Boolean),
    // show_rooms nodes → {prefix}TypeId, {prefix}TypeName, {prefix}Price
    ...nodes
      .filter((n) => n.type === "show_rooms")
      .flatMap((n) => {
        const p = (n.data as any).variableName as string;
        return p ? [`${p}TypeId`, `${p}TypeName`, `${p}Price`] : [];
      }),
    // well-known runtime vars always available after their respective nodes
    ...(nodes.some((n) => n.type === "show_rooms" || (n.type === "question" && (n.data as any).questionType === "room_selection"))
      ? ["bookingRoomTypeId", "bookingRoomTypeName", "bookingPricePerNight"] : []),
    ...(nodes.some((n) => n.type === "action" && (n.data as any).actionType === "create_booking")
      ? ["bookingRef", "bookingStatus", "bookingId"] : []),
    ...(nodes.some((n) => n.type === "check_availability")
      ? ["availabilityResult", "availabilityCount"] : []),
  ]));

  return (
    <ErrorBoundary>
    <div className="flex h-full flex-col overflow-hidden">
      <CanvasToolbar
        name={flowName}
        saving={saving}
        readOnly={readOnly}
        isTemplate={flow?.isTemplate ?? false}
        backHref="/dashboard/bot"
        onSave={handleSave}
        onNameChange={setFlowName}
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
                className="w-40 rounded-lg border border-dashed border-green-300 py-2 text-xs font-medium text-green-600 transition hover:bg-green-50"
              >
                + Add Start
              </button>
            )}
          </div>
        )}

        <div ref={reactFlowWrapper} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onDrop={readOnly ? undefined : onDrop}
            onDragOver={readOnly ? undefined : onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node as FlowNode)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={true}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <NodeInspectorPanel
          node={selectedNode}
          readOnly={readOnly}
          hotelCtx={hotelCtx}
          definedVars={definedVars}
          onChange={updateNodeData}
          onDelete={deleteNode}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
}
