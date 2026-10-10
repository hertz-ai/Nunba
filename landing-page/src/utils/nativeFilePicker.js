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
