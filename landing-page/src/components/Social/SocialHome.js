import React from 'react';
import {Outlet} from 'react-router-dom';
import SocialLayout from './SocialLayout';
import ErrorBoundary from '../shared/ErrorBoundary';

export default function SocialHome() {
  return (
    <SocialLayout>
      <ErrorBoundary variant="section">
        <Outlet />
      </ErrorBoundary>
    </SocialLayout>
  );
}
