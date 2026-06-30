import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import type { CableType, ValidationIssue, WorkflowTemplate } from "../../types";

interface WorkflowToolbarProps {
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  cableTypeId: string;
  onCableTypeChange: (id: string) => void;
  entryStepKey: string;
  onEntryStepChange: (key: string) => void;
  cableTypes: CableType[];
  templates: WorkflowTemplate[];
  selectedTemplateId: string;
  onTemplateSelect: (id: string) => void;
  stepKeys: string[];
  validationIssues: ValidationIssue[];
  onValidate: () => void;
  onSave: () => void;
  onLoad: () => void;
  saving: boolean;
  loading: boolean;
}

export default function WorkflowToolbar({
  templateName,
  onTemplateNameChange,
  cableTypeId,
  onCableTypeChange,
  entryStepKey,
  onEntryStepChange,
  cableTypes,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  stepKeys,
  validationIssues,
  onValidate,
  onSave,
  onLoad,
  saving,
  loading,
}: WorkflowToolbarProps) {
  const errors = validationIssues.filter((i) => i.level === "error");
  const warnings = validationIssues.filter((i) => i.level === "warning");

  return (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: validationIssues.length ? 2 : 0 }}>
        <TextField
          size="small"
          label="Template Name"
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Cable Type</InputLabel>
          <Select label="Cable Type" value={cableTypeId} onChange={(e) => onCableTypeChange(e.target.value)}>
            {cableTypes.map((ct) => (
              <MenuItem key={ct.id} value={ct.id}>
                {ct.code}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Entry Step</InputLabel>
          <Select label="Entry Step" value={entryStepKey} onChange={(e) => onEntryStepChange(e.target.value)}>
            {stepKeys.map((key) => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Load Template</InputLabel>
          <Select
            label="Load Template"
            value={selectedTemplateId}
            onChange={(e) => onTemplateSelect(e.target.value)}
          >
            <MenuItem value="">Select…</MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name} (v{t.version})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<CheckCircleIcon />} onClick={onValidate}>
          Validate
        </Button>
        <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={onLoad} disabled={!selectedTemplateId || loading}>
          Load
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={saving}>
          Save
        </Button>
      </Box>
      {validationIssues.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {errors.map((issue, i) => (
            <Alert key={`e-${i}`} severity="error" sx={{ py: 0 }}>
              {issue.message}
            </Alert>
          ))}
          {warnings.map((issue, i) => (
            <Alert key={`w-${i}`} severity="warning" sx={{ py: 0 }}>
              {issue.message}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}
