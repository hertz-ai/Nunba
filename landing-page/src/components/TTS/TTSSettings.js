/* eslint-disable */
/**
 * TTSSettings.js - TTS Configuration Component
 *
 * Provides UI for configuring Piper TTS settings:
 * - Enable/disable TTS
 * - Voice selection
 * - Speed control
 * - Voice installation
 */

import React, {useState, useEffect} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import GetAppIcon from '@mui/icons-material/GetApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';

const sxStyles = {
  dialogContent: {
    minWidth: 400,
    padding: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: '8px',
    color: 'text.primary',
  },
  voiceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '8px',
    marginBottom: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  voiceInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  voiceName: {
    fontWeight: 500,
  },
  voiceMeta: {
    fontSize: '0.75rem',
    color: 'rgba(0, 0, 0, 0.6)',
  },
  speedSlider: {
    marginTop: '16px',
  },
  statusChip: {
    marginLeft: '8px',
  },
  testButton: {
    marginTop: '16px',
  },
};

export function TTSSettings({
  open,
  onClose,
  ttsEnabled,
  setTtsEnabled,
  ttsVoice,
  setTtsVoice,
  ttsSpeed,
  setTtsSpeed,
  ttsHook, // The useTTS hook instance
}) {
  const [voices, setVoices] = useState({});
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(null);
  const [testText, setTestText] = useState(
    'Hello! This is a test of the text to speech system.'
  );
  const [error, setError] = useState(null);

  // Fetch voices on open
  useEffect(() => {
    if (open && ttsHook) {
      loadVoices();
    }
  }, [open, ttsHook]);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const voiceData = await ttsHook.fetchVoices();
      setVoices(voiceData || {});
    } catch (err) {
      setError('Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallVoice = async (voiceId) => {
    setInstalling(voiceId);
    setError(null);
    try {
      const success = await ttsHook.installVoice(voiceId);
      if (success) {
        await loadVoices();
      } else {
        setError(`Failed to install ${voiceId}`);
      }
    } catch (err) {
      setError(`Installation error: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleTestVoice = async () => {
    if (ttsHook && ttsEnabled) {
      await ttsHook.speak(testText, {voiceId: ttsVoice, speed: ttsSpeed});
    }
  };

  const handleSpeedChange = (event, newValue) => {
    setTtsSpeed(newValue);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <VolumeUpIcon style={{marginRight: 8}} />
          Text-to-Speech Settings
        </Box>
      </DialogTitle>

      <DialogContent sx={sxStyles.dialogContent}>
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            style={{marginBottom: 16}}
          >
            {error}
          </Alert>
        )}

        {/* Enable/Disable TTS */}
        <div style={sxStyles.section}>
          <FormControlLabel
            control={
              <Switch
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Enable Text-to-Speech"
          />
          <Typography variant="body2" color="textSecondary">
            Automatically speak assistant responses when no audio is provided
          </Typography>
        </div>

        {/* Voice Selection */}
        <div style={sxStyles.section}>
          <Typography sx={sxStyles.sectionTitle}>Voice</Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Select Voice</InputLabel>
                <Select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  label="Select Voice"
                  disabled={!ttsEnabled}
                >
                  {Object.entries(voices).map(([voiceId, voice]) => (
                    <MenuItem
                      key={voiceId}
                      value={voiceId}
                      disabled={!voice.installed}
                    >
                      <Box display="flex" alignItems="center" width="100%">
                        <span>{voice.name}</span>
                        {voice.installed ? (
                          <CheckCircleIcon
                            style={{
                              marginLeft: 'auto',
                              color: 'green',
                              fontSize: 16,
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={`${voice.size_mb} MB`}
                            sx={sxStyles.statusChip}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Voice list with install buttons */}
              <Box mt={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Available Voices
                </Typography>
                {Object.entries(voices).map(([voiceId, voice]) => (
                  <div key={voiceId} style={sxStyles.voiceItem}>
                    <div style={sxStyles.voiceInfo}>
                      <span style={sxStyles.voiceName}>{voice.name}</span>
                      <span style={sxStyles.voiceMeta}>
                        {voice.language} • {voice.quality} quality •{' '}
                        {voice.size_mb} MB
                      </span>
                    </div>
                    {voice.installed ? (
                      <Chip
                        size="small"
                        label="Installed"
                        color="primary"
                        icon={<CheckCircleIcon />}
                      />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          installing === voiceId ? (
                            <CircularProgress size={16} />
                          ) : (
                            <GetAppIcon />
                          )
                        }
                        onClick={() => handleInstallVoice(voiceId)}
                        disabled={installing !== null || !ttsEnabled}
                      >
                        Install
                      </Button>
                    )}
                  </div>
                ))}
              </Box>
            </>
          )}
        </div>

        {/* Speed Control */}
        <div style={sxStyles.section}>
          <Typography sx={sxStyles.sectionTitle}>
            Speed: {ttsSpeed.toFixed(1)}x
          </Typography>
          <Slider
            value={ttsSpeed}
            onChange={handleSpeedChange}
            min={0.5}
            max={2.0}
            step={0.1}
            marks={[
              {value: 0.5, label: '0.5x'},
              {value: 1.0, label: '1x'},
              {value: 1.5, label: '1.5x'},
              {value: 2.0, label: '2x'},
            ]}
            disabled={!ttsEnabled}
            sx={sxStyles.speedSlider}
          />
        </div>

        {/* Test Button */}
        <Button
          variant="outlined"
          color="primary"
          startIcon={<VolumeUpIcon />}
          onClick={handleTestVoice}
          disabled={
            !ttsEnabled || !voices[ttsVoice]?.installed || ttsHook?.isSpeaking
          }
          sx={sxStyles.testButton}
          fullWidth
        >
          {ttsHook?.isSpeaking ? 'Speaking...' : 'Test Voice'}
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * TTS Settings Button - Opens the settings dialog
 */
export function TTSSettingsButton({onClick}) {
  return (
    <Tooltip title="Text-to-Speech Settings">
      <IconButton onClick={onClick} size="small">
        <VolumeUpIcon />
      </IconButton>
    </Tooltip>
  );
}

export default TTSSettings;
