/**
 * saveTextFile: the desktop window refuses page downloads (pywebview's
 * ALLOW_DOWNLOADS is off), so there the OS save dialog writes the file
 * (native_file_save); a browser gets an ordinary download.
 *
 * Review of 33d0e576 (2026-11-20): the audit trail's Export did nothing in the
 * Nunba desktop app.
 */
import {saveTextFile} from '../../utils/nativeFilePicker';

afterEach(() => {
  delete window.pywebview;
  jest.restoreAllMocks();
});

it('hands the text to the desktop save dialog and reports where it went', async () => {
  const nativeSave = jest.fn().mockResolvedValue('C:\\Users\\a\\audit_54.jsonl');
  window.pywebview = {api: {window_minimize: () => {}, native_file_save: nativeSave}};
  const res = await saveTextFile('audit_54.jsonl', '{"a":1}\n');
  expect(nativeSave).toHaveBeenCalledWith('audit_54.jsonl', '{"a":1}\n');
  expect(res).toEqual({saved: true, where: 'C:\\Users\\a\\audit_54.jsonl'});
});

it('reports a cancelled desktop dialog as not saved', async () => {
  window.pywebview = {api: {native_file_save: jest.fn().mockResolvedValue('')}};
  expect(await saveTextFile('x.jsonl', 'z')).toEqual({saved: false});
});

it('downloads in a browser, where there is no desktop api', async () => {
  const click = jest.fn();
  const realCreate = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag) => {
    const el = realCreate(tag);
    if (tag === 'a') el.click = click;
    return el;
  });
  URL.createObjectURL = jest.fn(() => 'blob:x');
  URL.revokeObjectURL = jest.fn();
  const res = await saveTextFile('audit_54.jsonl', 'line\n', 'application/x-ndjson');
  expect(click).toHaveBeenCalledTimes(1);
  expect(res).toEqual({saved: true, where: 'audit_54.jsonl'});
});
