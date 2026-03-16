/**
 * CreatePostDialog - Thin wrapper that delegates to CreateThoughtExperimentDialog.
 *
 * Preserves backward-compatible import path for existing code that imports CreatePostDialog.
 */

import React from 'react';
import CreateThoughtExperimentDialog from './CreateThoughtExperimentDialog';

export default function CreatePostDialog({
  open,
  onClose,
  onCreated,
  communityId,
}) {
  return (
    <CreateThoughtExperimentDialog
      open={open}
      onClose={onClose}
      onCreated={onCreated}
      communityId={communityId}
    />
  );
}
