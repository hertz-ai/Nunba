/* eslint-disable */
import React from 'react';
import './PupitDocs.css';

const ClientSide = () => {
  const token = localStorage.getItem('hevolve_access_token');

  // Define the URLs
  const urlWithToken = 'https://azurekong.hertzai.com/talkinghead/video-gen';
  const urlWithRegister = -'https://mailer.hertzai.com/register_student';
  const urlWithoutToken = 'https://xxxx.hertzai.com:xxxx/client_id/xxxx';
  const urlWithLogin = 'https://mailer.hertzai.com/login';
  const verify_otp = 'https://mailer.hertzai.com/verify_otp';
  // Choose the URL based on the presence of the token
  const selectedUrl = token ? urlWithToken : urlWithoutToken;

  return (
    <>
      <div className="body">
        <header>
          <h1 className="heading">
            PupitAI Video Generation API Documentation
          </h1>
        </header>

        <nav className="toc">
          <h2 className="heading">Table of Contents</h2>
          <ul className="tocList">
            <li>
              <a href="#introduction" className="tocLink">
                1. Introduction
              </a>
            </li>
            <li>
              <a href="#developer-guide" className="tocLink">
                2. Developer Guide
              </a>
              <ul className="tocList">
                <li>
                  <a href="#getting-started" className="tocLink">
                    Getting Started
                  </a>
                </li>
                <li>
                  <a href="#authentication" className="tocLink">
                    Authentication
                  </a>
                </li>
                <li>
                  <a href="#basic-workflow" className="tocLink">
                    Basic Workflow
                  </a>
                </li>
              </ul>
            </li>
            <li>
              <a href="#api-reference" className="tocLink">
                3. API Reference
              </a>
              <ul className="tocList">
                <li>
                  <a href="#authentication-endpoints" className="tocLink">
                    Authentication Endpoints
                  </a>
                </li>
                <li>
                  <a href="#video-generation-endpoint" className="tocLink">
                    Video Generation Endpoint
                  </a>
                </li>
              </ul>
            </li>
            <li>
              <a href="#chunking" className="tocLink">
                4. Chunking and Response Handling
              </a>
            </li>
            <li>
              <a href="#avatar-creation" className="tocLink">
                5. Avatar Creation and Warm-up Process
              </a>
            </li>
            <li>
              <a href="#sample-code" className="tocLink">
                6. Sample Code
              </a>
            </li>
          </ul>
        </nav>

        <main>
          <section id="introduction">
            <h2 className="heading">1. Introduction</h2>
            <p>
              Welcome to the Video Generation API documentation. This API allows
              users to generate videos based on provided images, audio samples,
              and text. Before using the video generation feature, users must
              register and authenticate themselves.
            </p>
          </section>

          <section id="developer-guide">
            <h2 className="heading">2. Developer Guide</h2>

            <h3 id="getting-started" className="heading">
              Getting Started
            </h3>
            <p>To use the Video Generation API, follow these steps:</p>
            <ol>
              <li>Register as a user</li>
              <li>Login to receive an OTP</li>
              <li>Verify the OTP to receive an OAuth2 token</li>
              <li>Use the token to access the video generation endpoint</li>
            </ol>

            <h3 id="authentication" className="heading">
              Authentication
            </h3>
            <p>
              The API uses OAuth2 for authentication. You'll need to obtain a
              token through the registration and login process before accessing
              the video generation endpoint.
            </p>

            <h3 id="basic-workflow" className="heading">
              Basic Workflow
            </h3>
            <ol>
              <li>
                Register using the <code className="code">register_user</code>{' '}
                endpoint
              </li>
              <li>
                Login using the <code className="code">login</code> endpoint to
                receive an OTP
              </li>
              <li>
                Verify the OTP using the{' '}
                <code className="code">verify_otp</code> endpoint to receive an
                OAuth2 token
              </li>
              <li>
                Use the OAuth2 token in the Authorization header for the video
                generation API calls
              </li>
            </ol>
          </section>

          <section id="api-reference">
            <h2 className="heading">3. API Reference</h2>

            <h3 id="authentication-endpoints" className="heading">
              Authentication Endpoints
            </h3>
            <h4 className="heading">Register User</h4>
            <ul>
              <li>
                <strong>Endpoint</strong>:{' '}
                <code className="code">
                  {token
                    ? urlWithRegister
                    : 'https://xxxx.hertzai.com:xxxx/register_xxxx'}
                </code>
              </li>
              <li>
                <strong>Method</strong>: POST
              </li>
              <li>
                <strong>Description</strong>: Register a new user
              </li>
              <li>
                <strong>Required Fields</strong>:
                <ul>
                  <li>
                    <code className="code">name</code>
                  </li>
                  <li>
                    <code className="code">email_address</code>
                  </li>
                  <li>
                    <code className="code">phone_number</code>
                  </li>
                </ul>
              </li>
            </ul>

            <h4 className="heading">Login</h4>
            <ul>
              <li>
                <strong>Endpoint</strong>:{' '}
                <code className="code">
                  {token ? urlWithLogin : 'https://xxxx.hertzai.com/xxxx'}{' '}
                </code>
              </li>
              <li>
                <strong>Method</strong>: POST
              </li>
              <li>
                <strong>Description</strong>: Login to receive an OTP via email
                and phone
              </li>
              <li>
                <strong>Required Fields</strong>: Either
                <ul>
                  <li>
                    <code className="code">email_address</code> or
                  </li>
                  <li>
                    <code className="code">phone_number</code>
                  </li>
                </ul>
              </li>
            </ul>

            <h4 className="heading">Verify OTP</h4>
            <ul>
              <li>
                <strong>Endpoint</strong>:{' '}
                <code className="code">
                  {token ? verify_otp : 'https://xxxx.hertzai.com/xxxx'}
                </code>
              </li>
              <li>
                <strong>Method</strong>: POST
              </li>
              <li>
                <strong>Description</strong>: Verify the OTP received during
                login
              </li>
              <li>
                <strong>Required Fields</strong>:
                <ul>
                  <li>
                    Same <code className="code">email_address</code> or{' '}
                    <code className="code">phone_number</code> used in login
                  </li>
                  <li>
                    <code className="code">otp</code> received
                  </li>
                </ul>
              </li>
              <li>
                <strong>Response</strong>: OAuth2 token for use in subsequent
                API calls
              </li>
            </ul>

            <h3 id="video-generation-endpoint" className="heading">
              Video Generation Endpoint
            </h3>
            <h4 className="heading">Generate Video</h4>
            <ul>
              <li>
                <strong>Endpoint</strong>:{' '}
                <code className="code">{selectedUrl}</code>
              </li>
              <li>
                <strong>Method</strong>: POST
              </li>
              <li>
                <strong>Headers</strong>:
                <ul>
                  <li>
                    <code className="code">Content-Type</code>: application/json
                  </li>
                  <li>
                    <code className="code">Authorization</code>: Bearer{' '}
                    {'{OAuth2_token}'}
                  </li>
                </ul>
              </li>
              <li>
                <strong>Request Body</strong>:
              </li>
            </ul>
            <pre className="pre">
              <code>
                {`{
  "image_url": "string",
  "audio_sample_url": "string",
  "text": "string",
  "cartoon_image": "boolean",
  "uid": "string",
  "chunking": "boolean",
  "publish_id": "string",
  "avatar_id": "integer",
  "bg_url": "string",
  "vtoonify": "boolean",
  "remove_bg": "boolean"
}`}
              </code>
            </pre>
            <p>
              <strong>Required Fields</strong>:
            </p>
            <ul>
              <li>
                <code className="code">image_url</code>: URL of the image to be
                used in the video
              </li>
              <li>
                <code className="code">audio_sample_url</code>: URL of the audio
                sample to be used
              </li>
              <li>
                <code className="code">text</code>: The text to be converted to
                speech in the video
              </li>
              <li>
                <code className="code">cartoon_image</code>: Boolean indicating
                whether to use cartoon image processing
              </li>
              <li>
                <code className="code">uid</code>: Unique identifier for the
                request
              </li>
              <li>
                <code className="code">chunking</code>: Boolean indicating
                whether to receive the response in chunks
              </li>
              <li>
                <code className="code">publish_id</code>: Identifier for the
                websocket topic where chunks will be published
              </li>
            </ul>
            <p>
              <strong>Optional Fields</strong>:
            </p>
            <ul>
              <li>
                <code className="code">avatar_id</code>: (For
                successive/consecutive requests) The avatar_id received from the
                first request
              </li>
              <li>
                <code className="code">bg_url</code>: URL of the background
                image to be used
              </li>
              <li>
                <code className="code">vtoonify</code>: Boolean indicating
                whether to apply vtoonify effect
              </li>
              <li>
                <code className="code">remove_bg</code>: Boolean indicating
                whether to remove the background
              </li>
            </ul>
            <p>
              <strong>Response</strong>: An array of JSON objects, each
              representing a chunk of the generated video. Each chunk has the
              following structure:
            </p>
            <pre className="pre">
              <code>
                {`{
  "Total_chunks": "integer",
  "aud_url": "string",
  "avatar_id": "integer",
  "bg_url": "string",
  "current_chunk": "integer",
  "image_url": "string",
  "reference_txt": "string",
  "request_id": "string",
  "triangulation_txt": "string",
  "warper_txt": "string"
}`}
              </code>
            </pre>
          </section>

          <section id="chunking">
            <h2 className="heading">4. Chunking and Response Handling</h2>
            <p>
              When <code className="code">chunking</code> is set to true, the
              API will publish the generated video in chunks as they become
              available. These chunks are published on a websocket topic
              specified by the <code className="code">publish_id</code>{' '}
              parameter.
            </p>
            <p>
              To receive real-time updates as chunks are published, implement a
              PupitSDK client that subscribes to the topic specified by{' '}
              <code className="code">publish_id</code>.
            </p>
          </section>

          <section id="avatar-creation">
            <h2 className="heading">5. Avatar Creation and Warm-up Process</h2>
            <p>
              The first request for a new avatar will trigger the avatar
              creation process. To optimize performance:
            </p>
            <ol>
              <li>
                Make an initial request to create the avatar before any live
                usage.
              </li>
              <li>
                Store the returned <code className="code">avatar_id</code> for
                future use.
              </li>
              <li>
                Use this <code className="code">avatar_id</code> in all
                subsequent requests for that avatar.
              </li>
            </ol>
            <p>
              This warm-up process ensures that avatar creation doesn't impact
              the response time of live, real-time calls.
            </p>
          </section>

          <section id="sample-code">
            <h2 className="heading">6. Sample Code</h2>
            <p>
              Here's a Python example demonstrating how to use the video
              generation endpoint:
            </p>
            <pre className="pre">
              <code>
                {`import requests
import json

url = "${selectedUrl}"

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_OAUTH2_TOKEN_HERE'
}

def warm_up_avatar():
    warm_up_payload = json.dumps({
        "image_url": "https://example.com/image.png",
        "audio_sample_url": "https://example.com/audio.wav",
        "text": "Warm-up request to create the avatar.",
        "cartoon_image": True,
        "uid": "WARM_UP_REQUEST",
        "chunking": True,
        "publish_id": "warm_up_publish_id"
    })

    response = requests.post(url, headers=headers, data=warm_up_payload)
    first_response = response.json()
    return first_response[0]['avatar_id']

# Warm-up: Create avatar and get avatar_id
avatar_id = warm_up_avatar()
print(f"Avatar created with ID: {avatar_id}")

# Function for live, real-time video generation
def generate_video(text, publish_id):
    payload = json.dumps({
        "image_url": "https://example.com/image.png",
        "audio_sample_url": "https://example.com/audio.wav",
        "text": text,
        "cartoon_image": True,
        "uid": "LIVE_REQUEST",
        "chunking": True,
        "publish_id": publish_id,
        "avatar_id": avatar_id,
        "bg_url": "https://example.com/background.jpg",
        "vtoonify": False,
        "remove_bg": False
    })

    response = requests.post(url, headers=headers, data=payload)
    return response.json()

# Example of a live request
live_response = generate_video(
    "This is a live request using the pre-created avatar.",
    "live_publish_id_001"
)
print(live_response)`}
              </code>
            </pre>
            <p>
              Remember to replace{' '}
              <code className="code">'Bearer YOUR_OAUTH2_TOKEN_HERE'</code> with
              the actual OAuth2 token received from the{' '}
              <code className="code">verify_otp</code> endpoint, and implement
              proper error handling in production code.
            </p>
          </section>
        </main>
      </div>
    </>
  );
};

export default ClientSide;
