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

import { adminApiFetch } from "@/lib/adminApi";
import { useMounted } from "@/lib/useMounted";
import type { FlowDefinition, FlowNode, FlowEdge, HotelContext } from "@/app/dashboard/bot/flows/types";

import StartNode             from "@/app/dashboard/bot/flows/nodes/StartNode";
import MessageNode           from "@/app/dashboard/bot/flows/nodes/MessageNode";
import QuestionNode          from "@/app/dashboard/bot/flows/nodes/QuestionNode";
import BranchNode            from "@/app/dashboard/bot/flows/nodes/BranchNode";
import ActionNode            from "@/app/dashboard/bot/flows/nodes/ActionNode";
import EndNode               from "@/app/dashboard/bot/flows/nodes/EndNode";
import CheckAvailabilityNode from "@/app/dashboard/bot/flows/nodes/CheckAvailabilityNode";
import ShowRoomsNode         from "@/app/dashboard/bot/flows/nodes/ShowRoomsNode";
import NodePalette           from "@/app/dashboard/bot/flows/NodePalette";
import CanvasToolbar         from "@/app/dashboard/bot/flows/CanvasToolbar";
import NodeInspectorPanel    from "@/app/dashboard/bot/flows/NodeInspectorPanel";

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
    default:                   return {};
  }
}

let _idx = 1;

export default function AdminFlowCanvasPage() {
  const mounted = useMounted();
  const params  = useParams();
  const flowId  = params["id"] as string;

  const [flow,      setFlow]      = useState<FlowDefinition | null>(null);
  const [flowName,  setFlowName]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [hotelCtx,  setHotelCtx]  = useState<HotelContext | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selectedNode, setSelectedNode]  = useState<FlowNode | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted) return;
    adminApiFetch(`/admin/flows/${flowId}`)
      .then(async (data: FlowDefinition) => {
        setFlow(data);
        setFlowName(data.name);
        setNodes((data.nodes as FlowNode[]) ?? []);
        setEdges((data.edges as FlowEdge[]) ?? []);

        // Load hotel context if the flow is tied to a specific hotel
        if (data.hotelId) {
          try {
            const [hotel, rooms] = await Promise.all([
              adminApiFetch(`/admin/hotels/${data.hotelId}`),
              adminApiFetch(`/admin/hotels/${data.hotelId}/room-types`).catch(() => []),
            ]);
            setHotelCtx({
              hotelId:        data.hotelId,
              hotelName:      hotel.name ?? data.hotelId,
              roomTypes:      rooms ?? [],
              bookingEnabled: hotel.config?.bookingEnabled ?? true,
            });
          } catch { /* hotel context is best-effort */ }
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mounted, flowId]);

  // Admin can always edit flows (even templates — that's the point)
  const readOnly = false;

  const nodeTypes = useMemo<NodeTypes>(() => ({
    start:              StartNode as any,
    message:            MessageNode as any,
    question:           QuestionNode as any,
    branch:             BranchNode as any,
    action:             ActionNode as any,
    end:                EndNode as any,
    check_availability: CheckAvailabilityNode as any,
    show_rooms:         ShowRoomsNode as any,
  }), []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!reactFlowWrapper.current) return;
    const type = e.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = { x: e.clientX - bounds.left - 80, y: e.clientY - bounds.top - 30 };
    setNodes((nds) => nds.concat({
      id: `node-${Date.now()}-${_idx++}`, type: type as any, position,
      data: defaultData(type) as any,
    }));
  }, [setNodes]);

  const updateNodeData = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: data as any } : n));
    setSelectedNode((prev) => prev?.id === id ? { ...prev, data: data as any } : prev);
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await adminApiFetch(`/admin/flows/${flowId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: flowName, nodes, edges }),
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#E5E0D4] border-t-[#1B52A8]" />
      </div>
    );
  }

  if (error && !flow) {
    return <div className="flex h-full items-center justify-center text-sm text-red-500">{error}</div>;
  }

  const hasStart = nodes.some((n) => n.type === "start");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CanvasToolbar
        name={flowName}
        saving={saving}
        readOnly={readOnly}
        isTemplate={flow?.isTemplate ?? false}
        backHref="/admin/flows"
        onSave={handleSave}
        onNameChange={setFlowName}
      />

      {error && (
        <div className="shrink-0 bg-red-50 px-4 py-2 text-center text-xs text-red-600">{error}</div>
      )}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="flex flex-col gap-2">
          <NodePalette />
          {!hasStart && (
            <button
              onClick={() =>
                setNodes((nds) =>
                  nds.concat({ id: `node-start-${Date.now()}`, type: "start" as any, position: { x: 200, y: 60 }, data: { label: "" } as any })
                )
              }
              className="w-40 rounded-lg border border-dashed border-green-300 py-2 text-xs font-medium text-green-600 transition hover:bg-green-50"
            >
              + Add Start
            </button>
          )}
        </div>

        <div ref={reactFlowWrapper} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node as FlowNode)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <NodeInspectorPanel
          node={selectedNode}
          readOnly={readOnly}
          hotelCtx={hotelCtx ?? undefined}
          definedVars={Array.from(new Set([
            ...nodes.filter((n) => n.type === "question").map((n) => (n.data as any).variableName as string).filter(Boolean),
            ...nodes.filter((n) => n.type === "show_rooms").flatMap((n) => {
              const p = (n.data as any).variableName as string;
              return p ? [`${p}TypeId`, `${p}TypeName`, `${p}Price`] : [];
            }),
            ...(nodes.some((n) => n.type === "show_rooms" || (n.type === "question" && (n.data as any).questionType === "room_selection"))
              ? ["bookingRoomTypeId", "bookingRoomTypeName", "bookingPricePerNight"] : []),
            ...(nodes.some((n) => n.type === "action" && (n.data as any).actionType === "create_booking")
              ? ["bookingRef", "bookingStatus", "bookingId"] : []),
            ...(nodes.some((n) => n.type === "check_availability")
              ? ["availabilityResult", "availabilityCount"] : []),
          ]))}
          onChange={updateNodeData}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
}
