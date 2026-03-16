/* eslint-disable */
import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import './HevolveDocs.css';
import Header from '../pages/Layouts/header';
import FooterLight from '../pages/Layouts/footer-light';
import {logger} from '../utils/logger';

const HevolveDocs = () => {
  const [activeTab, setActiveTab] = useState('client');
  const location = useLocation();
  const token = localStorage.getItem('hevolve_access_token');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const activeStyle = {
    color: 'red',
  };

  const inactiveStyle = {
    color: 'white',
  };

  useEffect(() => {}, [activeTab]);

  return (
    <>
      <Header />
      <div className="container mx-auto my-5">
        <div className="flex justify-around mb-4">
          <button
            style={activeTab === 'client' ? activeStyle : inactiveStyle}
            className="px-4 py-2 rounded-lg transition-colors duration-300 mx-2"
            onClick={() => handleTabChange('client')}
          >
            Hevolve Client-Side Integration Guide
          </button>
          <button
            style={activeTab === 'server' ? activeStyle : inactiveStyle}
            className="px-4 py-2 rounded-lg transition-colors duration-300 mx-2"
            onClick={() => handleTabChange('server')}
          >
            Hevolve Server-Side Integration (Coming Soon)
          </button>
        </div>

        <div className="border p-5 rounded-lg border-gray-300 mt-4 prose max-w-none">
          {activeTab === 'client' ? (
            <>
              <h1>HertzAI Hevolve Widget - Quick Integration Guide</h1>

              <h2>Installation</h2>
              <h3>Step 1: Add the Script to Your Website</h3>
              {token ? (
                <pre>
                  <code>{`<script>
var script = document.createElement('script');
script.src = "https://hevolve.hertzai.com/hevolve-widget.js";
script.onload = initializeWidget;
document.body.appendChild(script);
</script>`}</code>
                </pre>
              ) : (
                <p className="text-red-500 font-semibold">
                  Please{' '}
                  <a href="/teacher/signin" className="underline text-blue-500">
                    Log in
                  </a>{' '}
                  to Get Your Widget Code
                </p>
              )}

              <h3>Step 2: Initialize the Widget</h3>
              <pre>
                <code>{`<script>
  function initializeWidget() {
    if (typeof HevolveWidget !== 'undefined') {
      const config = {
        agentName: 'Radha',
        authToken: 'YOUR_TOKEN',
        userId: 'USER_ID',
        emailAddress: 'user@example.com'
      };

      const widgetInstance = HevolveWidget.init(config);

      widgetInstance.on('open', function() {
        logger.log('Widget opened');
      });

      widgetInstance.on('close', function() {
        logger.log('Widget closed');
      });

      widgetInstance.on('message', function(data) {
        logger.log('New message:', data);
      });
    }
  }
</script>`}</code>
              </pre>

              <h3>Step 3: Host the Widget Script</h3>
              {token ? (
                <p>
                  You can download the widget file here:&nbsp;
                  <a
                    href="/path-to-your/hevolve-widget.js"
                    download
                    className="text-blue-600 underline"
                  >
                    Download hevolve-widget.js
                  </a>
                </p>
              ) : (
                <p className="text-red-500 font-semibold">
                  Please{' '}
                  <a href="/teacher/signin" className="underline text-blue-500">
                    log in
                  </a>{' '}
                  to download the widget script.
                </p>
              )}

              <hr />
              <p>
                <strong>That's it!</strong> The Hevolve chat widget will now
                appear as a floating button on your website, ready to assist
                your users.
              </p>
            </>
          ) : (
            <>
              <h2>Server-Side Integration for Hevolve Widget</h2>
              <p>Documentation coming soon...</p>
            </>
          )}
        </div>
      </div>
      <FooterLight />
    </>
  );
};

export default HevolveDocs;
