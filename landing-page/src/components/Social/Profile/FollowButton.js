import {usersApi} from '../../../services/socialApi';

import {Button, CircularProgress} from '@mui/material';
import React, {useState} from 'react';

export default function FollowButton({userId, initialFollowing = false}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      if (following) {
        await usersApi.unfollow(userId);
        setFollowing(false);
      } else {
        await usersApi.follow(userId);
        setFollowing(true);
      }
    } catch (err) {
      /* ignore */
    }
    setLoading(false);
  };

  return (
    <Button
      variant={following ? 'outlined' : 'contained'}
      color="primary"
      size="small"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        <CircularProgress size={18} />
      ) : following ? (
        'Unfollow'
      ) : (
        'Follow'
      )}
    </Button>
  );
}
