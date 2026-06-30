import { Box, Button, ButtonGroup, Slider, Typography } from "@mui/material";

const PRESETS = [0.5, 1, 2, 5, 10];

interface SpeedControlProps {
  speedMultiplier: number;
  onChange: (speed: number) => void;
  disabled?: boolean;
}

export default function SpeedControl({ speedMultiplier, onChange, disabled }: SpeedControlProps) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Simulation Speed
      </Typography>
      <ButtonGroup size="small" disabled={disabled} sx={{ mb: 1.5 }}>
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            variant={speedMultiplier === preset ? "contained" : "outlined"}
            onClick={() => onChange(preset)}
          >
            {preset}x
          </Button>
        ))}
      </ButtonGroup>
      <Slider
        value={speedMultiplier}
        min={0.5}
        max={10}
        step={0.5}
        marks={[
          { value: 0.5, label: "0.5x" },
          { value: 5, label: "5x" },
          { value: 10, label: "10x" },
        ]}
        disabled={disabled}
        onChange={(_, value) => onChange(value as number)}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}x`}
      />
    </Box>
  );
}
