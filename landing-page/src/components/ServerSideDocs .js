/* eslint-disable */
import React from 'react';

import Header from '../pages/Layouts/header';
import FooterLight from '../pages/Layouts/footer-light';
const ServerSideDocs = () => {
  return (
    <>
      <div style={{marginTop: '100px'}} className="container mx-auto px-4 ">
        <h1 className="text-3xl  font-bold mb-4">
          Pupit Realtime Video Server-Side Documentation
        </h1>

        <h2 className="text-2xl font-semibold mt-8">Table of Contents</h2>
        <ul className="list-disc ml-8">
          <li>
            <a href="#installation" className="text-blue-500 hover:underline">
              Installation
            </a>
          </li>
          <li>
            <a href="#layout-setup" className="text-blue-500 hover:underline">
              Layout Setup
            </a>
          </li>
          <li>
            <a href="#implementation" className="text-blue-500 hover:underline">
              Implementation
            </a>
          </li>
          <li>
            <a href="#api-reference" className="text-blue-500 hover:underline">
              API Reference
            </a>
          </li>
          <li>
            <a href="#usage-examples" className="text-blue-500 hover:underline">
              Usage Examples
            </a>
          </li>
          <li>
            <a href="#best-practices" className="text-blue-500 hover:underline">
              Best Practices
            </a>
          </li>
        </ul>

        <section id="installation" className="mt-8">
          <h2 className="text-2xl font-semibold">Installation</h2>
          <h3 className="text-xl font-medium">Gradle Setup</h3>
          <p>
            Add the following to your app's <code>build.gradle</code>:
          </p>
          <pre className="bg-gray-100 p-4 rounded">
            <code>{`dependencies {\n    implementation 'com.yourcompany:video-player-sdk:1.0.0'\n}`}</code>
          </pre>
        </section>

        <section id="layout-setup" className="mt-8">
          <h2 className="text-2xl font-semibold">Layout Setup</h2>
          <h3 className="text-xl font-medium">Create Layout XML</h3>
          <p>
            Create a layout file <code>player.xml</code> in your{' '}
            <code>res/layout</code> directory:
          </p>
          <pre className="bg-gray-100 p-4 rounded">
            <code>{`<?xml version="1.0" encoding="utf-8"?>\n<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"\n    android:layout_width="match_parent"\n    android:layout_height="match_parent">\n\n    <com.hertzai.pupit.pupitlibrary.view.PupitTxtToVideo\n        android:id="@+id/pupit_video"\n        android:layout_width="match_parent"\n        android:layout_height="match_parent" />\n\n</RelativeLayout>`}</code>
          </pre>
        </section>

        <section id="implementation" className="mt-8">
          <h2 className="text-2xl font-semibold">Implementation</h2>
          <h3 className="text-xl font-medium">Basic Activity Setup</h3>
          <p>Here's a simple implementation of the VideoActivity:</p>
          <pre className="bg-gray-100 p-4 rounded">
            <code>{`public class VideoActivity extends AppCompatActivity {\n    private PupitTxtToVideo pupitVideo;\n\n    @Override\n    protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        setContentView(R.layout.player);\n        pupitVideo = findViewById(R.id.pupit_video);\n        pupitVideo.startPlayer(publishID);\n    }\n\n    @Override\n    protected void onPause() {\n        super.onPause();\n        pupitVideo.onPause();\n    }\n\n    @Override\n    protected void onResume() {\n        super.onResume();\n        pupitVideo.onResume();\n    }\n}`}</code>
          </pre>
        </section>

        <section id="api-reference" className="mt-8">
          <h2 className="text-2xl font-semibold">API Reference</h2>
          <h3 className="text-xl font-medium">PupitTxtToVideo Class Methods</h3>
          <ul className="list-disc ml-8">
            <li>
              <strong>startPlayer(String publishID)</strong>: Initiates the
              video player by subscribing to a stream identified by the
              specified publishID.
            </li>
            <li>
              <strong>playVideoFromRequestId(String requestId)</strong>: Plays a
              video from the internal queue, starting from the specific request
              identified by its requestId.
            </li>
            <li>
              <strong>stopPlayer()</strong>: Stops the video playback and cleans
              up resources.
            </li>
            <li>
              <strong>onPause()</strong>: Pauses video playback.
            </li>
            <li>
              <strong>onResume()</strong>: Resumes video playback.
            </li>
          </ul>
        </section>

        <section id="best-practices" className="mt-8">
          <h2 className="text-2xl font-semibold">Best Practices</h2>
          <h3 className="text-xl font-medium">Implementation Guidelines</h3>
          <ul className="list-disc ml-8">
            <li>
              Always initialize the SDK in <code>onCreate()</code>.
            </li>
            <li>Properly handle lifecycle methods.</li>
            <li>Clean up resources when the activity is destroyed.</li>
            <li>Implement error handling for network issues.</li>
          </ul>
        </section>
      </div>
    </>
  );
};

export default ServerSideDocs;
