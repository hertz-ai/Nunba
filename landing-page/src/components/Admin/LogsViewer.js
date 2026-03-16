/* eslint-disable */
/**
 * LogsViewer.js - View and manage application logs
 *
 * Features:
 * - List available log files
 * - View log contents with syntax highlighting
 * - Download logs
 * - Clear logs
 * - Open logs folder
 * - Crash reporting dashboard link
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FolderOpen as FolderIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  BugReport as BugIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const API_BASE = 'http://localhost:5000';

// Log level colors
const LOG_LEVEL_COLORS = {
  DEBUG: '#9e9e9e',
  INFO: '#9B94FF',
  WARNING: '#ff9800',
  ERROR: '#f44336',
  CRITICAL: '#d32f2f',
};

function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logContent, setLogContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crashStatus, setCrashStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [confirmClear, setConfirmClear] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const contentRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Fetch available logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/logs`);
      const data = await response.json();
      setLogs(data.logs || []);
      setCrashStatus(data.crash_reporting || {});
      setError(null);
    } catch (err) {
      setError('Failed to fetch logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch specific log content
  const fetchLogContent = useCallback(async (logFile, lines = 500) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/logs/view?file=${encodeURIComponent(
          logFile
        )}&lines=${lines}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setLogContent(data.content || '');
      setError(null);

      // Scroll to bottom
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      setError('Failed to fetch log content: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Download log file
  const downloadLog = useCallback(async (logFile) => {
    try {
      window.open(
        `${API_BASE}/logs/download?file=${encodeURIComponent(logFile)}`,
        '_blank'
      );
    } catch (err) {
      setError('Failed to download log: ' + err.message);
    }
  }, []);

  // Clear log file
  const clearLog = useCallback(
    async (logFile) => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/logs/clear`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({file: logFile}),
        });
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          // Refresh content if viewing this log
          if (selectedLog === logFile) {
            setLogContent('');
          }
          fetchLogs();
        }
      } catch (err) {
        setError('Failed to clear log: ' + err.message);
      } finally {
        setLoading(false);
        setConfirmClear(null);
      }
    },
    [selectedLog, fetchLogs]
  );

  // Open logs folder
  const openLogsFolder = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/logs/open-folder`);
    } catch (err) {
      setError('Failed to open folder: ' + err.message);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh when enabled
  useEffect(() => {
    if (autoRefresh && selectedLog) {
      refreshIntervalRef.current = setInterval(() => {
        fetchLogContent(selectedLog);
      }, 3000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, selectedLog, fetchLogContent]);

  // Filter log content
  const filteredContent = React.useMemo(() => {
    if (!logContent) return '';

    let lines = logContent.split('\n');

    // Filter by search query
    if (searchQuery) {
      lines = lines.filter((line) =>
        line.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by log level
    if (filterLevel !== 'ALL') {
      lines = lines.filter(
        (line) =>
          line.includes(` - ${filterLevel} - `) ||
          line.includes(`[${filterLevel}]`)
      );
    }

    return lines.join('\n');
  }, [logContent, searchQuery, filterLevel]);

  // Render log line with syntax highlighting
  const renderLogLine = (line, index) => {
    let color = '#fff';
    let icon = null;

    if (line.includes(' - INFO - ') || line.includes('[INFO]')) {
      color = LOG_LEVEL_COLORS.INFO;
      icon = <InfoIcon sx={{fontSize: 14, mr: 1}} />;
    } else if (line.includes(' - WARNING - ') || line.includes('[WARNING]')) {
      color = LOG_LEVEL_COLORS.WARNING;
      icon = <WarningIcon sx={{fontSize: 14, mr: 1}} />;
    } else if (line.includes(' - ERROR - ') || line.includes('[ERROR]')) {
      color = LOG_LEVEL_COLORS.ERROR;
      icon = <ErrorIcon sx={{fontSize: 14, mr: 1}} />;
    } else if (line.includes(' - DEBUG - ') || line.includes('[DEBUG]')) {
      color = LOG_LEVEL_COLORS.DEBUG;
    } else if (line.includes(' - CRITICAL - ')) {
      color = LOG_LEVEL_COLORS.CRITICAL;
      icon = <ErrorIcon sx={{fontSize: 14, mr: 1}} />;
    }

    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          color,
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: 1.5,
          py: 0.25,
          '&:hover': {bgcolor: 'rgba(255,255,255,0.05)'},
        }}
      >
        {icon}
        <span style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
          {line}
        </span>
      </Box>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Box sx={{display: 'flex', height: '100%', gap: 2}}>
      {/* Left panel - Log files list */}
      <Paper sx={{width: 300, p: 2, display: 'flex', flexDirection: 'column', bgcolor: 'rgba(15,14,23,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '12px'}}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{color: '#fff', fontWeight: 600}}>Log Files</Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchLogs} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open Folder">
              <IconButton size="small" onClick={openLogsFolder}>
                <FolderIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Crash reporting status */}
        {crashStatus && (
          <Box sx={{mb: 2}}>
            <Chip
              icon={<BugIcon />}
              label={
                crashStatus.enabled
                  ? 'Crash Reporting On'
                  : 'Crash Reporting Off'
              }
              color={
                crashStatus.enabled && crashStatus.initialized
                  ? 'success'
                  : 'default'
              }
              size="small"
              sx={{mb: 1}}
            />
            {crashStatus.dashboard_url &&
              !crashStatus.dashboard_url.includes('Configure') && (
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  onClick={() =>
                    window.open(crashStatus.dashboard_url, '_blank')
                  }
                  sx={{ml: 1}}
                >
                  Dashboard
                </Button>
              )}
          </Box>
        )}

        <Divider sx={{mb: 2}} />

        {loading && !logs.length ? (
          <CircularProgress sx={{alignSelf: 'center', my: 4, color: '#6C63FF'}} />
        ) : (
          <List sx={{flex: 1, overflow: 'auto'}}>
            {logs.map((log) => (
              <ListItem
                key={log.path}
                button
                selected={selectedLog === log.path}
                onClick={() => {
                  setSelectedLog(log.path);
                  fetchLogContent(log.path);
                }}
                sx={{borderRadius: 1, mb: 0.5}}
              >
                <ListItemText
                  primary={log.name}
                  secondary={
                    <>
                      {formatFileSize(log.size)}
                      <br />
                      {formatDate(log.modified)}
                    </>
                  }
                  primaryTypographyProps={{fontSize: '14px'}}
                  secondaryTypographyProps={{fontSize: '11px'}}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => downloadLog(log.path)}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear">
                    <IconButton
                      size="small"
                      onClick={() => setConfirmClear(log)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Right panel - Log content */}
      <Paper sx={{flex: 1, p: 2, display: 'flex', flexDirection: 'column', bgcolor: 'rgba(15,14,23,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '12px'}}>
        {selectedLog ? (
          <>
            {/* Toolbar */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 2}}>
              <TextField
                size="small"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{mr: 1, color: 'text.secondary'}} />
                  ),
                }}
                sx={{width: 250}}
              />

              <ToggleButtonGroup
                value={filterLevel}
                exclusive
                onChange={(e, value) => value && setFilterLevel(value)}
                size="small"
              >
                <ToggleButton value="ALL">All</ToggleButton>
                <ToggleButton value="INFO">Info</ToggleButton>
                <ToggleButton value="WARNING">Warn</ToggleButton>
                <ToggleButton value="ERROR">Error</ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{flex: 1}} />

              <Tooltip
                title={autoRefresh ? 'Stop Auto-Refresh' : 'Auto-Refresh (3s)'}
              >
                <Button
                  variant={autoRefresh ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? 'Stop' : 'Auto'}
                </Button>
              </Tooltip>

              <Tooltip title="Refresh">
                <IconButton
                  onClick={() => fetchLogContent(selectedLog)}
                  disabled={loading}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Log content */}
            <Paper
              ref={contentRef}
              sx={{
                flex: 1,
                overflow: 'auto',
                bgcolor: 'rgba(15,14,23,0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(108,99,255,0.1)',
                borderRadius: '8px',
                p: 2,
                fontFamily: 'monospace',
              }}
            >
              {loading ? (
                <CircularProgress sx={{display: 'block', mx: 'auto', my: 4, color: '#6C63FF'}} />
              ) : filteredContent ? (
                filteredContent.split('\n').map(renderLogLine)
              ) : (
                <Typography
                  color="text.secondary"
                  sx={{textAlign: 'center', py: 4}}
                >
                  Log file is empty
                </Typography>
              )}
            </Paper>
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Typography color="text.secondary">
              Select a log file to view its contents
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Error alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{position: 'fixed', bottom: 16, right: 16, zIndex: 9999}}
        >
          {error}
        </Alert>
      )}

      {/* Clear confirmation dialog */}
      <Dialog open={!!confirmClear} onClose={() => setConfirmClear(null)}>
        <DialogTitle>Clear Log File?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear {confirmClear?.name}? This cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => clearLog(confirmClear?.path)}
            disabled={loading}
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LogsViewer;
