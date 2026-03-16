import React from 'react';
import Actions from './Actions';
import Welcome from './Welcome';
import './TeacherHome.css';

function Body() {
  return (
    <div className="body-section">
      <Welcome />
      <Actions />
    </div>
  );
}

export default Body;
