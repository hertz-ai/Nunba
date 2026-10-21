import PageSkeleton from './shared/PageSkeleton';

import {useSocial} from '../contexts/SocialContext';

import React, {useEffect, useRef} from 'react';
import {Navigate, useLocation} from 'react-router-dom';

// Role hierarchy: central > regional > flat > guest > anonymous
const ROLE_LEVELS = {
  anonymous: 0,
  guest: 1,
  flat: 2,
  regional: 3,
  central: 4,
};

/**
 * RoleGuard - Route protection based on user role tier.
 *
 * Props:
 *   minRole: 'flat' | 'regional' | 'central' - minimum role required
 *   allowGuest: boolean - if true, guests can view (read-only mode)
 *   fallback: string - redirect path if access denied (default: '/social')
 */
export default function RoleGuard({
  children,
  minRole = 'flat',
  allowGuest = false,
  fallback = '/social',
}) {
  const {accessTier, loading} = useSocial();
  const location = useLocation();

  if (loading) return <PageSkeleton dark />;

  const userLevel = ROLE_LEVELS[accessTier] || 0;
  const requiredLevel = ROLE_LEVELS[minRole] || 0;

  // User meets the minimum role requirement
  if (userLevel >= requiredLevel) {
    return children;
  }

  // Allow guest access if configured
  if (allowGuest && userLevel >= ROLE_LEVELS.guest) {
    return children;
  }

  // Redirect to fallback
  return <Navigate to={fallback} state={{from: location}} replace />;
}

/**
 * useRoleAccess - Hook for component-level permission checks.
 */
export function useRoleAccess() {
  const {accessTier} = useSocial();
  const level = ROLE_LEVELS[accessTier] || 0;

  return {
    accessTier,
    isCentral: level >= ROLE_LEVELS.central,
    isRegional: level >= ROLE_LEVELS.regional,
    isFlat: level >= ROLE_LEVELS.flat,
    isGuest: accessTier === 'guest',
    isAnonymous: accessTier === 'anonymous',
    isAuthenticated: level >= ROLE_LEVELS.flat,
    canWrite: level >= ROLE_LEVELS.flat,
    canModerate: level >= ROLE_LEVELS.regional,
    canAdmin: level >= ROLE_LEVELS.guest, // Device config: channels, settings, identity, workflows (guest+ on desktop)
    canNetworkAdmin: level >= ROLE_LEVELS.central, // Network admin: user mgmt, moderation (master key required)
  };
}

/**
 * useAccessCheck - what a guard does with `allowed`: 'allow', 'deny', or
 * 'wait' (show a spinner).
 *
 * A refusal that rests on a /auth/me that never answered (profileAnswer
 * 'unanswered': 404 while HARTOS registers the route at boot, a server
 * error, no connection) is not a signed-out user.  The guard asks /auth/me
 * once when it mounts and decides on that answer; a second non-answer is
 * refused as before.
 */
export function useAccessCheck(allowed) {
  const {loading, profileAnswer, fetchProfile} = useSocial();
  const asked = useRef(false);
  const mustAsk =
    !loading && !allowed && profileAnswer === 'unanswered' && !asked.current;

  useEffect(() => {
    if (mustAsk && !asked.current) {
      asked.current = true;
      fetchProfile();
    }
  }, [mustAsk, fetchProfile]);

  if (loading) return 'wait';
  if (allowed) return 'allow';
  if (mustAsk || profileAnswer === 'asking') return 'wait';
  return 'deny';
}
