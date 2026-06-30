import { Box, Paper, Snackbar, Alert } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button } from "@mui/material";
import {
  createWorkflowTemplate,
  fetchCableTypes,
  fetchMachines,
  fetchWorkflowTemplate,
  fetchWorkflowTemplates,
} from "../api/resources";
import MachinePalette from "../components/workflow/MachinePalette";
import WorkflowCanvas, { useEdgesState, useNodesState, type WorkflowFlowNode } from "../components/workflow/WorkflowCanvas";
import type { Edge } from "@xyflow/react";
import WorkflowToolbar from "../components/workflow/WorkflowToolbar";
import PageHeader from "../components/common/PageHeader";
import PageState from "../components/common/PageState";
import { useAsyncData } from "../hooks/useAsyncData";
import { graphToTemplatePayload, templateToGraph } from "../utils/workflowSerializer";
import { hasValidationErrors, validateWorkflow } from "../utils/workflowValidation";
import type { ValidationIssue } from "../types";

export default function WorkflowDesignerPage() {
  const [templateName, setTemplateName] = useState("New Workflow");
  const [cableTypeId, setCableTypeId] = useState("");
  const [entryStepKey, setEntryStepKey] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { data: machinesData, loading: machinesLoading, error: machinesError } = useAsyncData(
    () => fetchMachines({ limit: 100, is_active: true }),
    [],
  );

  const { data: cableTypesData } = useAsyncData(() => fetchCableTypes({ limit: 50 }), []);

  const { data: templatesData, refetch: refetchTemplates } = useAsyncData(
    () => fetchWorkflowTemplates({ limit: 50 }),
    [],
  );

  const machines = machinesData?.items ?? [];
  const cableTypes = cableTypesData?.items ?? [];
  const templates = templatesData?.items ?? [];

  useEffect(() => {
    if (!cableTypeId && cableTypes.length > 0) {
      setCableTypeId(cableTypes[0].id);
    }
  }, [cableTypes, cableTypeId]);

  useEffect(() => {
    if (!entryStepKey && nodes.length > 0) {
      setEntryStepKey(nodes[0].id);
    }
  }, [nodes, entryStepKey]);

  const stepKeys = useMemo(() => nodes.map((n) => n.id), [nodes]);

  const handleValidate = useCallback(() => {
    const issues = validateWorkflow(nodes, edges, entryStepKey || nodes[0]?.id || "");
    setValidationIssues(issues);
    const invalidNodeIds = new Set(issues.filter((i) => i.nodeId).map((i) => i.nodeId!));
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, invalid: invalidNodeIds.has(n.id) },
      })),
    );
  }, [nodes, edges, entryStepKey, setNodes]);

  const handleLoad = useCallback(async () => {
    if (!selectedTemplateId) return;
    setLoadingTemplate(true);
    try {
      const template = await fetchWorkflowTemplate(selectedTemplateId);
      const graph = templateToGraph(template);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setTemplateName(template.name);
      setCableTypeId(template.cable_type_id);
      setEntryStepKey(template.entry_step_key);
      setValidationIssues([]);
      setSnackbar({ message: `Loaded "${template.name}"`, severity: "success" });
    } catch {
      setSnackbar({ message: "Failed to load template", severity: "error" });
    } finally {
      setLoadingTemplate(false);
    }
  }, [selectedTemplateId, setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    const entry = entryStepKey || nodes[0]?.id || "";
    const issues = validateWorkflow(nodes, edges, entry);
    setValidationIssues(issues);
    if (hasValidationErrors(issues)) return;
    if (!cableTypeId || !templateName.trim()) {
      setSnackbar({ message: "Template name and cable type are required", severity: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = graphToTemplatePayload(nodes, edges, {
        name: templateName.trim(),
        cableTypeId,
        entryStepKey: entry,
      });
      const created = await createWorkflowTemplate(payload);
      setSnackbar({ message: `Saved "${created.name}"`, severity: "success" });
      refetchTemplates();
      setSelectedTemplateId(created.id);
    } catch {
      setSnackbar({ message: "Failed to save workflow — check permissions and step keys", severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, entryStepKey, cableTypeId, templateName, refetchTemplates]);

  return (
    <>
      <PageHeader
        title="Workflow Designer"
        subtitle="Drag machines onto the canvas, connect steps, validate, and save templates"
        action={
          <Button component={RouterLink} to="/workflow" variant="outlined" size="small">
            Execution Tracker
          </Button>
        }
      />

      <PageState loading={machinesLoading} error={machinesError}>
        <Paper sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 500 }}>
          <WorkflowToolbar
            templateName={templateName}
            onTemplateNameChange={setTemplateName}
            cableTypeId={cableTypeId}
            onCableTypeChange={setCableTypeId}
            entryStepKey={entryStepKey}
            onEntryStepChange={setEntryStepKey}
            cableTypes={cableTypes}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={setSelectedTemplateId}
            stepKeys={stepKeys}
            validationIssues={validationIssues}
            onValidate={handleValidate}
            onSave={handleSave}
            onLoad={handleLoad}
            saving={saving}
            loading={loadingTemplate}
          />
          <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
            <MachinePalette machines={machines} />
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setNodes={setNodes}
              setEdges={setEdges}
            />
          </Box>
        </Paper>
      </PageState>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity ?? "info"} onClose={() => setSnackbar(null)}>
          {snackbar?.message ?? ""}
        </Alert>
      </Snackbar>
    </>
  );
}
