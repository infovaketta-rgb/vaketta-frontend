// ── Node output schema types ──────────────────────────────────────────────────
//
// Each automation node that writes flowVars declares a typed output schema. The
// Flow Builder's variable picker is driven ENTIRELY by these schemas (via
// ./registry) — there is no separately maintained central var list.
//
// `key`   — the flowVar name; inserted into message text as {{key}}.
// `type`  — how the value is shaped at runtime. Only `string`/`number` resolve to
//           a sensible {{key}} substitution; `array`/`object` are JSON blobs and
//           the picker badges them as "not usable raw in text".
// `label` — human-readable name shown in the picker.

export type VariableType = "string" | "number" | "array" | "object";

export type VariableDef = {
  key:   string;
  type:  VariableType;
  label: string;
};

// A schema is either a static list of outputs, or a function of the node's data
// (for nodes whose output var names depend on configuration, e.g. a question's
// `variableName`). The registry normalises both to a list.
export type NodeOutputSchema =
  | VariableDef[]
  | ((data: Record<string, unknown>) => VariableDef[]);
