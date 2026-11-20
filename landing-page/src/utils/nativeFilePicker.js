/**
 * The desktop shell's native "open file" dialog, when it has one.
 *
 * pywebview puts `window.pywebview.api` on every desktop window, because the
 * custom titlebar needs its window_* methods.  `native_file_pick` is a separate
 * method (desktop/native_api_window.py FilePickerApi), so the existence of
 * `api` says nothing about it: ask for the method itself.
 */
export const hasNativeFilePicker = () =>
  typeof window !== 'undefined' &&
  typeof window.pywebview?.api?.native_file_pick === 'function';

/** The last segment of a path from either OS ("C:\\Docs\\a.pdf" or "/Docs/a.pdf"). */
export const baseName = (filePath) => String(filePath || '').split(/[\\/]/).pop();

/**
 * Give the person a text file to keep.
 *
 * The desktop window refuses page downloads (pywebview's ALLOW_DOWNLOADS is
 * off), so there the OS save dialog writes it (native_file_save, beside
 * native_file_pick).  A browser gets an ordinary download.
 *
 * Resolves {saved: true, where} with the path chosen on the desktop or the
 * file name in a browser, {saved: false, cancelled: true} when the person
 * closed the dialog, or {saved: false, error} when it could not be written.
 */
export const saveTextFile = async (name, text, mime = 'text/plain') => {
  const api = typeof window !== 'undefined' ? window.pywebview?.api : null;
  if (typeof api?.native_file_save === 'function') {
    const res = (await api.native_file_save(name, text)) || {};
    if (res.saved) return {saved: true, where: res.path};
    if (res.cancelled) return {saved: false, cancelled: true};
    return {saved: false, error: res.error || 'the file could not be written'};
  }
  const url = URL.createObjectURL(new Blob([text], {type: mime}));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  // Revoked a moment later: revoking in the same tick can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return {saved: true, where: name};
};
