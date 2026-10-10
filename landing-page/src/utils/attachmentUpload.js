/**
 * Chat composer attachments: the PDF and image upload flows.
 *
 * Moved out of Demopage.js so they can be tested without mounting that
 * component; Demopage hands in its state setters and its notifier.
 *
 * One picker decision, hasNativeFilePicker(), is shared with ChatInputBar's
 * buttons: where the desktop shell has a native dialog the file is picked there
 * and the server copies it by path (/upload/native); everywhere else the
 * browser's file input supplies the bytes.
 *
 * A refused upload is told to the person.  The server names its reason
 * (`reason`, else `error`) and used to be read into the console only, so a
 * refusal looked like nothing happening.
 */
import {baseName, hasNativeFilePicker} from './nativeFilePicker';

import {BOOK_PARSING_URL, UPLOAD_FILE_URL, UPLOAD_NATIVE_URL} from '../config/apiBase';

import {v4 as uuidv4} from 'uuid';

const NOTE_MS = 8000;

/** What to tell the person about a response the server refused. */
export async function uploadFailureMessage(response, noun) {
  let body = null;
  try {
    body = await response.json();
  } catch (_e) { /* a refusal can arrive with no body (e.g. the transport's size limit) */ }
  const reason = body && (body.reason || body.error);
  if (reason) return `${noun} not uploaded: ${reason}`;
  if (response.status === 413) return `${noun} is too large to upload (HTTP 413)`;
  return `${noun} not uploaded (HTTP ${response.status})`;
}

const tell = (ctx, message) => ctx.notify({type: 'error', message, duration: NOTE_MS});

export async function selectPdf(event, ctx) {
  const {userId, setPdfFile, setpdfFileUrl, setRequestId, setPdfurl} = ctx;

  const refused = async (response) => {
    console.error('Failed to upload PDF:', response.status);
    setPdfFile(null);
    tell(ctx, await uploadFailureMessage(response, 'PDF'));
  };
  const broke = (error) => {
    console.error('Error during PDF upload process:', error);
    setPdfFile(null);
    tell(ctx, `PDF not uploaded: ${error && error.message ? error.message : error}`);
  };

  if (hasNativeFilePicker()) {
    try {
      const filePath = await window.pywebview.api.native_file_pick('pdf');
      if (!filePath) return;
      setPdfFile({name: baseName(filePath)});
      const response = await fetch(UPLOAD_NATIVE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: filePath, user_id: userId, request_id: uuidv4()}),
      });
      if (!response.ok) return await refused(response);
      const result = await response.json();
      setRequestId(result.request_id);
      setpdfFileUrl(result.file_url);
    } catch (error) {
      broke(error);
    }
    return;
  }

  const file = event.target.files[0];

  if (!file) {
    console.error('No file selected.');
    return;
  }
  if (file.type === 'application/pdf') {
    setPdfurl(URL.createObjectURL(file));
  }

  try {
    setPdfFile(file);

    const formdata = new FormData();
    formdata.append('bot_type', 'book_parsing');
    formdata.append('user_id', userId);
    formdata.append('request_id', uuidv4());
    formdata.append('file', file, file.name);

    const response = await fetch(BOOK_PARSING_URL, {
      method: 'POST',
      body: formdata,
      redirect: 'follow',
    });
    if (!response.ok) return await refused(response);

    const result = await response.json();
    setRequestId(result.request_id);
    setpdfFileUrl(result.file_url);
  } catch (error) {
    broke(error);
  }
}

export async function selectImage(event, ctx) {
  const {userId, setUserImage, setIsImageUploading} = ctx;

  const refused = async (response) => {
    console.error('Failed to upload image:', response.status);
    setUserImage(null);
    tell(ctx, await uploadFailureMessage(response, 'Image'));
  };
  const broke = (error) => {
    console.error('Error uploading image:', error);
    setUserImage(null);
    tell(ctx, `Image not uploaded: ${error && error.message ? error.message : error}`);
  };

  if (hasNativeFilePicker()) {
    setIsImageUploading(true);
    try {
      const filePath = await window.pywebview.api.native_file_pick('image');
      if (!filePath) return;
      const response = await fetch(UPLOAD_NATIVE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: filePath, user_id: userId, request_id: uuidv4()}),
      });
      if (!response.ok) return await refused(response);
      const result = await response.json();
      setUserImage(result.file_url);
    } catch (error) {
      broke(error);
    } finally {
      setIsImageUploading(false);
    }
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  setIsImageUploading(true);
  setUserImage(URL.createObjectURL(file));

  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('file', file, file.name);
  formData.append('request_id', uuidv4());

  try {
    const response = await fetch(UPLOAD_FILE_URL, {
      method: 'POST',
      body: formData,
      redirect: 'follow',
    });
    if (!response.ok) return await refused(response);
    const result = await response.json();
    setUserImage(result.file_url);
  } catch (error) {
    broke(error);
  } finally {
    setIsImageUploading(false);
  }
}
