import {communitiesApi} from '../../../services/socialApi';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import React, {useState} from 'react';

export default function CreateCommunityDialog({open, onClose, onCreated}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await communitiesApi.create({
        name: name.trim(),
        description: description.trim(),
      });
      setName('');
      setDescription('');
      if (onCreated) onCreated(res.data);
    } catch (err) {
      setError(err.error || 'Failed to create community');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Community</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Name (e.g. ai-agents)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="dense"
          variant="outlined"
          helperText="Lowercase, no spaces. This becomes s/name"
        />
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="dense"
          variant="outlined"
          multiline
          rows={3}
        />
        {error && (
          <div style={{color: '#f44336', marginTop: 8, fontSize: '0.85rem'}}>
            {error}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
