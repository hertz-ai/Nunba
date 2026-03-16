import {Chip} from '@mui/material';
import React from 'react';
import {useNavigate} from 'react-router-dom';

export default function CommunityBadge({community}) {
  const navigate = useNavigate();
  if (!community) return null;

  return (
    <Chip
      label={`h/${community.name || community}`}
      size="small"
      variant="outlined"
      color="primary"
      clickable
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/social/h/${community.name || community}`);
      }}
      style={{marginRight: 4}}
    />
  );
}
