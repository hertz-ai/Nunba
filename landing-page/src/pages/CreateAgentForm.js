import {
  UPLOAD_IMAGE_URL,
  UPLOAD_AUDIO_URL,
} from '../config/apiBase';
import {logger} from '../utils/logger';

import {X, Upload} from 'lucide-react';
import {useState, useRef, useEffect} from 'react';
import {v4 as uuidv4} from 'uuid';


const CreateAgentForm = ({onClose, onSubmit, userId}) => {
  const [agentName, setAgentName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState('');
  // Defaults (owner, 2026-11-26): a voice-only agent with a stock voice. A face (a video
  // agent) and a cloned voice are choices; an unchosen one uploads nothing.  The same rule
  // as hevolve.ai's create form (Hevolve c6518da).
  const [withFace, setWithFace] = useState(false);
  const [cloneVoice, setCloneVoice] = useState(false);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    setRequestId(uuidv4());
  }, []);

  // Picking a file only keeps it: it is uploaded on Create, and only for a chosen face or
  // cloned voice (so the image goes up with the agent's final name).
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('user_id', userId);
    formData.append('vtoonify', 'true');
    formData.append('request_id', requestId);
    formData.append('name', agentName);
    const response = await fetch(UPLOAD_IMAGE_URL, {method: 'POST', body: formData});
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    // Its teacher_avatar_id is the face (and, with the recording of the same request_id,
    // the voice) the agent speaks with.
    const result = await response.json();
    logger.log('Image uploaded successfully:', result);
    return result;
  };

  const uploadAudio = async (file) => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('user_id', userId);
    formData.append('request_id', requestId);
    const response = await fetch(UPLOAD_AUDIO_URL, {method: 'POST', body: formData});
    if (!response.ok) {
      throw new Error('Failed to upload audio');
    }
    logger.log('Audio uploaded successfully:', await response.json());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // An upload that fails leaves the agent voice-only / in a stock voice: it is still made.
    const face = withFace && imageFile;
    const voice = cloneVoice && audioFile;
    let teacherAvatarId = null;
    if (face) {
      try {
        teacherAvatarId = (await uploadImage(imageFile))?.teacher_avatar_id ?? null;
      } catch (error) { console.error('Error uploading image:', error); }
    }
    if (voice) {
      try { await uploadAudio(audioFile); } catch (error) { console.error('Error uploading audio:', error); }
    }

    try {
      // The agent is made on this desktop (owner 2026-11-28, "Create locally, sync up"):
      // the page's own conversational creation, seeded with this form's name and
      // description and the face just uploaded, which HARTOS keeps on the agent's record.
      // It reaches central by that creation's own sync, as every desktop agent does.
      // NOT CARRIED YET: voice_clone (the local creation has no field for it; a recording
      // speaks through the face of the same request_id).
      onSubmit({
        fromCreateForm: true,
        name: agentName,
        prompt: prompt,
        is_public: isPublic,
        media: teacherAvatarId ? 'video' : 'voice',
        voice_clone: Boolean(voice),
        ...(teacherAvatarId ? {teacher_avatar_id: teacherAvatarId} : {}),
      });

      onClose();
    } catch (error) {
      console.error('Error creating agent:', error);
    } finally {
      setIsSubmitting(false);
      setRequestId(null);
    }
  };

  return (
    <div
      className="bg-gray-800 rounded-lg p-6 h-3/4 w-2/4 overflow-y-auto shadow-lg absolute z-50 
        top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-white">Create New Agent</h2>
        <button onClick={onClose} className="btn-feedback text-white hover:text-gray-300">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Agent Name Input */}
        <div className="mb-2">
          <label htmlFor="agentName" className="block text-white mb-2">
            Agent Name
          </label>
          <input
            type="text"
            id="agentName"
            className="w-full bg-gray-700 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            required
          />
        </div>

        {/* Voice-only and a stock voice are the defaults; each choice opens its upload. */}
        <div className="mb-2 flex flex-col space-y-1">
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              checked={withFace}
              onChange={(e) => {
                setWithFace(e.target.checked);
                if (!e.target.checked) { setImageFile(null); setImagePreview(''); }
              }}
              className="w-4 h-4 mr-2 rounded bg-gray-700 border-gray-600"
            />
            Give the agent a face (video agent); unticked, it is voice only
          </label>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              checked={cloneVoice}
              onChange={(e) => {
                setCloneVoice(e.target.checked);
                if (!e.target.checked) { setAudioFile(null); }
              }}
              className="w-4 h-4 mr-2 rounded bg-gray-700 border-gray-600"
            />
            Speak in a recorded voice (voice cloning); unticked, a stock voice
          </label>
        </div>

        {/* Image and Audio Upload in Same Row */}
        <div className="flex flex-row space-x-2 mb-2">
          {withFace && (
          <div className="flex-1">
            <label className="block text-white mb-2">Agent Image</label>
            <div
              className="border-2 border-dashed border-gray-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer h-24 w-44"
              onClick={() => imageInputRef.current.click()}
            >
              {imagePreview ? (
                <div className="relative w-12 h-12">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-8 h-8 object-cover rounded-full"
                  />
                  <button
                    type="button"
                    className="btn-feedback absolute top-0 right-0 bg-red-500 rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview('');
                    }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-gray-400 text-center text-sm">
                    Upload an image for your agent
                  </p>
                </>
              )}
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
          )}

          {/* Audio Upload */}
          {cloneVoice && (
          <div className="flex-1">
            <label className="block text-white mb-2">Agent Voice (Audio)</label>
            <div
              className="border-2 border-dashed border-gray-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer h-24 w-44"
              onClick={() => audioInputRef.current.click()}
            >
              {audioFile ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-gray-300 truncate">
                    {audioFile.name}
                  </span>
                  <button
                    type="button"
                    className="btn-feedback bg-red-500 rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudioFile(null);
                    }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-gray-400 text-center text-sm">
                    Upload an audio file for your agent's voice
                  </p>
                </>
              )}
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioChange}
                accept="audio/*"
                className="hidden"
              />
            </div>
          </div>
          )}
        </div>

        {/* Prompt Input */}
        <div className="mb-2">
          <label htmlFor="prompt" className="block text-white mb-2">
            Agent Prompt
          </label>
          <textarea
            id="prompt"
            className="w-full bg-gray-700 text-white rounded p-2 h-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter instructions for your agent..."
            required
          />
        </div>

        {/* Public or private (owner 2026-11-28, "Bring it back now"): named on each
            creation turn, kept on the agent's record by HARTOS, and sent with it to
            central's agent list. */}
        <div className="mb-6 flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="isPublic" className="ml-2 text-white">
            Make this agent public
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-feedback w-full py-2 px-4 rounded text-white font-medium flex items-center justify-center"
          style={{
            background: 'linear-gradient(to right, #00e89d, #0078ff)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  );
};

export default CreateAgentForm;
