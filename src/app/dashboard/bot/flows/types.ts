import type { Node, Edge } from "@xyflow/react";

// ── Node data shapes (must match backend flowTypes.ts) ────────────────────────

export type ValidationRule = "none" | "date" | "number" | "email";

export type QuestionType =
  | "text"
  | "room_selection"   // legacy — use show_rooms node for new flows
  | "date"
  | "number"
  | "yes_no"
  | "rating";

export type ActionType =
  | "create_booking"
  | "update_booking_status"
  | "start_booking_flow"
  | "handoff_to_staff"
  | "notify_staff"
  | "reset_to_menu"
  | "set_variable"
  | "send_review_request"
  | "view_bookings";

export type NodeType =
  | "start"
  | "message"
  | "question"
  | "branch"
  | "action"
  | "end"
  | "check_availability"
  | "show_rooms"
  | "time_condition"
  | "jump"
  | "show_menu";

// ── Node data interfaces ──────────────────────────────────────────────────────

export interface StartNodeData { label?: string; [key: string]: unknown }

export interface MessageNodeData { text: string; [key: string]: unknown }

export interface QuestionNodeData {
  text:            string;
  questionType:    QuestionType;
  variableName:    string;
  validation:      ValidationRule;
  validationError: string;
  // date
  dateMin?:     "today" | "none";
  dateMaxDays?: number;
  // number
  numberMin?: number;
  numberMax?: number;
  // yes_no
  yesLabel?: string;
  noLabel?:  string;
  // rating
  ratingMax?:               number;
  ratingPositiveThreshold?: number;
  reviewUrl?:               string;
  [key: string]: unknown;
}

export interface BranchCondition {
  id:           string;
  variable:     string;
  operator:     "equals" | "not_equals" | "contains" | "starts_with" | "gt" | "lt";
  compareValue: string;
  label:        string;
}

export interface BranchNodeData {
  conditions:      BranchCondition[];
  defaultHandleId: string;
  [key: string]:   unknown;
}

export interface CheckAvailabilityNodeData {
  roomTypeIdVar:       string;
  checkInVar:          string;
  checkOutVar:         string;
  unavailableMessage?: string;
  [key: string]: unknown;
}

export interface ShowRoomsNodeData {
  text:             string;
  filter:           "all" | "available_only";
  checkInVar?:      string;
  checkOutVar?:     string;
  minCapacity?:     number;
  minAdults?:       number;
  minChildren?:     number;
  variableName:     string;
  validationError?: string;
  [key: string]: unknown;
}

export interface ActionNodeData {
  actionType:      ActionType;
  message?:        string;
  // create_booking
  guestNameVar?:   string;
  roomTypeIdVar?:  string;
  checkInVar?:     string;
  checkOutVar?:    string;
  advancePaidVar?: string;
  // start_booking_flow (legacy)
  prefillFromVars?: boolean;
  // update_booking_status
  bookingRefVar?:  string;
  newStatus?:      "CONFIRMED" | "CANCELLED" | "HOLD";
  // set_variable
  variableToSet?:  string;
  valueToSet?:     string;
  // send_review_request
  reviewUrl?:      string;
  reviewMessage?:  string;
  // business hours gate (handoff_to_staff / notify_staff)
  businessHoursOnly?:   boolean;
  outsideHoursMessage?: string;
  [key: string]: unknown;
}

export interface EndNodeData {
  farewellText?: string;
  [key: string]: unknown;
}

/** Routes by time-of-day using hotel's business hours config.
 *  Handles: "business_hours" | "after_hours" | "weekend" */
export interface TimeConditionNodeData {
  label?: string;
  [key: string]: unknown;
}

/** Jump to another node in the same flow (enables loops / sub-menus). */
export interface JumpNodeData {
  targetNodeId: string;
  label?:       string;
  [key: string]: unknown;
}

/** Emits the hotel's formatted WhatsApp menu text inline. */
export interface ShowMenuNodeData {
  label?: string;
  [key: string]: unknown;
}

// ── Hotel context (passed into canvas + inspector) ────────────────────────────

export interface HotelRoomType {
  id:          string;
  name:        string;
  basePrice:   number;
  capacity:    number | null;
  maxAdults:   number | null;
  maxChildren: number | null;
  description: string | null;
}

export interface HotelContext {
  hotelId:        string;
  hotelName:      string;
  roomTypes:      HotelRoomType[];
  bookingEnabled: boolean;
}

export type FlowNodeData =
  | StartNodeData
  | MessageNodeData
  | QuestionNodeData
  | BranchNodeData
  | CheckAvailabilityNodeData
  | ShowRoomsNodeData
  | ActionNodeData
  | EndNodeData;

// ── React Flow typed node/edge ─────────────────────────────────────────────────

export type FlowNode = Node<FlowNodeData, NodeType>;
export type FlowEdge = Edge;

// ── API response shapes ────────────────────────────────────────────────────────

export interface FlowDefinition {
  id:          string;
  hotelId:     string | null;
  name:        string;
  description: string | null;
  nodes:       FlowNode[];
  edges:       FlowEdge[];
  isActive:    boolean;
  isTemplate:  boolean;
  createdAt:   string;
  updatedAt:   string;
  hotel?:      { id: string; name: string } | null;
}

export interface FlowSummary {
  id:          string;
  hotelId:     string | null;
  name:        string;
  description: string | null;
  isActive:    boolean;
  isTemplate:  boolean;
  createdAt:   string;
  updatedAt:   string;
  hotel?:      { id: string; name: string } | null;
}
