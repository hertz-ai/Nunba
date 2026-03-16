/* eslint-disable */
import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import './PupitDocs.css';
import ClientSide from './Client-Side';
import ServerSide from './ServerSideDocs ';
import MindstorySDKDocs from './MindstorySDKDocs';
import HevolveDocs from './HevolveDocs';
import Header from '../pages/Layouts/header';
import FooterLight from '../pages/Layouts/footer-light';
import { NunbaChatProvider, NunbaChatPill, NunbaChatPanel } from './Social/shared/NunbaChat';

const PupitDocs = () => {
  const [activeTab, setActiveTab] = useState('sdk');
  const location = useLocation();

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

  const renderContent = () => {
    switch (activeTab) {
      case 'sdk':
        return <MindstorySDKDocs />;
      case 'client':
        return <ClientSide />;
      case 'server':
        return <ServerSide />;
      case 'widget':
        return <HevolveDocs />;
      default:
        return <MindstorySDKDocs />;
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto my-5">
        <div className="flex justify-around mb-4 flex-wrap">
          <button
            style={activeTab === 'sdk' ? activeStyle : inactiveStyle}
            className={`px-4 py-2 rounded-lg transition-colors duration-300 mx-2`}
            onClick={() => handleTabChange('sdk')}
          >
            Mindstory SDK
          </button>
          <button
            style={activeTab === 'client' ? activeStyle : inactiveStyle}
            className={`px-4 py-2 rounded-lg transition-colors duration-300 mx-2`}
            onClick={() => handleTabChange('client')}
          >
            Pupit Video API (Client-Side)
          </button>
          <button
            style={activeTab === 'server' ? activeStyle : inactiveStyle}
            className={`px-4 py-2 rounded-lg transition-colors duration-300 mx-2`}
            onClick={() => handleTabChange('server')}
          >
            Pupit SDK (Server-Side)
          </button>
          <button
            style={activeTab === 'widget' ? activeStyle : inactiveStyle}
            className={`px-4 py-2 rounded-lg transition-colors duration-300 mx-2`}
            onClick={() => handleTabChange('widget')}
          >
            Website Widget
          </button>
        </div>

        <div className="border p-5 rounded-lg border-gray-300 mt-4">
          {renderContent()}
        </div>
      </div>
      <FooterLight />
      <NunbaChatProvider>
        <NunbaChatPill />
        <NunbaChatPanel />
      </NunbaChatProvider>
    </>
  );
};

export default PupitDocs;
