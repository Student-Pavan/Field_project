import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/common/PageHeader";

import { ROLE_LABELS } from "../utils/constants";

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [compactTables, setCompactTables] = useState(false);

  return (
    <>
      <PageHeader title="Settings" subtitle="Account preferences and application configuration" />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Profile
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                <TextField label="Full Name" value={user?.full_name ?? ""} disabled fullWidth />
                <TextField label="Email" value={user?.email ?? ""} disabled fullWidth />
                <TextField label="Username" value={user?.username ?? ""} disabled fullWidth />
                <TextField
                  label="Role"
                  value={user ? ROLE_LABELS[user.role] : ""}
                  disabled
                  fullWidth
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Preferences
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                  }
                  label="Email notifications for order updates"
                />
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
                  }
                  label="Dark mode (coming soon)"
                  disabled
                />
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={compactTables}
                      onChange={(e) => setCompactTables(e.target.checked)}
                    />
                  }
                  label="Compact table rows"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
                Preferences are stored locally in this session preview.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                API Connection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Backend URL:{" "}
                <strong>{import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Ensure the backend is running with migrations applied and seed data loaded for
                full dashboard functionality.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
