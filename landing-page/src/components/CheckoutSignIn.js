import OtpAuthModal from '../pages/OtpAuthModal';

import React from 'react';

/**
 * The sign-in a checkout asks for.  `signIn` is usePlanCheckout's {returnPath}
 * (or null: nothing shown).  After a successful sign-in the modal takes the
 * person to returnPath, the plan they chose, instead of to their agents.
 */
export default function CheckoutSignIn({signIn, onClose}) {
  if (!signIn) return null;
  return (
    <OtpAuthModal
      isOpen
      onClose={onClose}
      message="Sign in to continue to payment"
      returnTo={signIn.returnPath}
    />
  );
}
