import { Alert, Box, CircularProgress } from "@mui/material";

interface PageStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export default function PageState({
  loading,
  error,
  empty,
  emptyMessage = "No data found",
  children,
}: PageStateProps) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (empty) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  return <>{children}</>;
}
