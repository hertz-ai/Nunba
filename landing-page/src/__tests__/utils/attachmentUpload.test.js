/**
 * Book / image upload from the chat composer, on the three shapes of host.
 *
 * Measured 2026-10-10: on Windows `window.pywebview.api` exists (WindowApi
 * hands the titlebar its window_* methods) but has no `native_file_pick`, which
 * only the macOS class defines.  The handlers tested `window.pywebview &&
 * window.pywebview.api`, took the native branch, threw "native_file_pick is not
 * a function", logged it and returned, so on Windows no file was ever uploaded.
 *
 * These tests drive the real handlers through that real shape.
 */
import {BOOK_PARSING_URL, UPLOAD_FILE_URL, UPLOAD_NATIVE_URL} from '../../config/apiBase';
import * as upload from '../../utils/attachmentUpload';
import * as picker from '../../utils/nativeFilePicker';

jest.mock('uuid', () => ({v4: () => 'req-1'}));

const WINDOWS_API = {window_minimize: () => {}, window_close: () => {}};
const macApi = (picked) => ({
  window_minimize: () => {},
  native_file_pick: jest.fn().mockResolvedValue(picked),
});

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'status text',
  json: async () => {
    if (body === undefined) throw new Error('no body');
    return body;
  },
});

const makeCtx = () => ({
  userId: 'u1',
  setPdfFile: jest.fn(),
  setpdfFileUrl: jest.fn(),
  setRequestId: jest.fn(),
  setPdfurl: jest.fn(),
  setUserImage: jest.fn(),
  setIsImageUploading: jest.fn(),
  notify: jest.fn(),
});

const pdf = () => new File(['%PDF-1.4'], 'book.pdf', {type: 'application/pdf'});
const png = () => new File(['x'], 'pic.png', {type: 'image/png'});

beforeEach(() => {
  global.fetch = jest.fn();
  global.URL.createObjectURL = jest.fn(() => 'blob:preview');
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete window.pywebview;
  jest.restoreAllMocks();
});

describe('which picker a host has', () => {
  test('a plain browser has none', () => {
    expect(picker.hasNativeFilePicker()).toBe(false);
  });

  test('Windows: an api with only window_* methods is not a picker', () => {
    window.pywebview = {api: WINDOWS_API};
    expect(picker.hasNativeFilePicker()).toBe(false);
  });

  test('macOS: an api that has native_file_pick is', () => {
    window.pywebview = {api: macApi('/Users/a/Documents/b.pdf')};
    expect(picker.hasNativeFilePicker()).toBe(true);
  });
});

describe('baseName', () => {
  test('splits a POSIX path', () => {
    expect(picker.baseName('/Users/a/Documents/book.pdf')).toBe('book.pdf');
  });

  test('splits a Windows path', () => {
    expect(picker.baseName('C:\\Users\\a\\Documents\\book.pdf')).toBe('book.pdf');
  });

  test('an empty path is an empty name', () => {
    expect(picker.baseName('')).toBe('');
    expect(picker.baseName(undefined)).toBe('');
  });
});

describe('selectPdf on Windows (an api with no native_file_pick)', () => {
  test('uploads the file the person chose, through the browser path', async () => {
    window.pywebview = {api: WINDOWS_API};
    fetch.mockResolvedValue(reply(200, {request_id: 'r9', file_url: '/uploads/files/b.pdf'}));
    const ctx = makeCtx();

    await upload.selectPdf({target: {files: [pdf()]}}, ctx);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(BOOK_PARSING_URL);
    expect(ctx.setpdfFileUrl).toHaveBeenCalledWith('/uploads/files/b.pdf');
    expect(ctx.setRequestId).toHaveBeenCalledWith('r9');
  });
});

describe('selectPdf with a native picker', () => {
  test('posts the picked path, and names the file by its last segment on Windows paths too', async () => {
    const picked = 'C:\\Users\\a\\Documents\\book.pdf';
    window.pywebview = {api: macApi(picked)};
    fetch.mockResolvedValue(reply(200, {request_id: 'r9', file_url: '/uploads/files/b.pdf'}));
    const ctx = makeCtx();

    await upload.selectPdf({target: {files: []}}, ctx);

    expect(fetch.mock.calls[0][0]).toBe(UPLOAD_NATIVE_URL);
    expect(JSON.parse(fetch.mock.calls[0][1].body).path).toBe(picked);
    expect(ctx.setPdfFile).toHaveBeenCalledWith({name: 'book.pdf'});
    expect(ctx.setpdfFileUrl).toHaveBeenCalledWith('/uploads/files/b.pdf');
  });

  test('a cancelled dialog uploads nothing', async () => {
    window.pywebview = {api: macApi('')};
    const ctx = makeCtx();

    await upload.selectPdf({target: {files: []}}, ctx);

    expect(fetch).not.toHaveBeenCalled();
    expect(ctx.setPdfFile).not.toHaveBeenCalled();
  });
});

describe('a refused upload is named to the person', () => {
  test('the server\'s reason for refusing a picked path is shown, and the file is not left as uploaded', async () => {
    window.pywebview = {api: macApi('D:\\books\\big.pdf')};
    fetch.mockResolvedValue(reply(400, {
      error: 'invalid path',
      reason: 'path outside user dirs (resolved=D:\\books\\big.pdf)',
    }));
    const ctx = makeCtx();

    await upload.selectPdf({target: {files: []}}, ctx);

    expect(ctx.notify).toHaveBeenCalledTimes(1);
    const note = ctx.notify.mock.calls[0][0];
    expect(note.type).toBe('error');
    expect(note.message).toContain('path outside user dirs');
    expect(ctx.setPdfFile).toHaveBeenLastCalledWith(null);
    expect(ctx.setpdfFileUrl).not.toHaveBeenCalled();
  });

  test('a browser upload the server rejects says so, and the file is not left as uploaded', async () => {
    fetch.mockResolvedValue(reply(413));
    const ctx = makeCtx();

    await upload.selectPdf({target: {files: [pdf()]}}, ctx);

    const note = ctx.notify.mock.calls[0][0];
    expect(note.type).toBe('error');
    expect(note.message).toMatch(/413/);
    expect(ctx.setPdfFile).toHaveBeenLastCalledWith(null);
  });

  test('a request that never reached the server says so', async () => {
    fetch.mockRejectedValue(new Error('Failed to fetch'));
    const ctx = makeCtx();

    await upload.selectPdf({target: {files: [pdf()]}}, ctx);

    const note = ctx.notify.mock.calls[0][0];
    expect(note.type).toBe('error');
    expect(note.message).toContain('Failed to fetch');
    expect(ctx.setPdfFile).toHaveBeenLastCalledWith(null);
  });
});

describe('selectImage', () => {
  test('Windows: uploads the chosen image through the browser path', async () => {
    window.pywebview = {api: WINDOWS_API};
    fetch.mockResolvedValue(reply(200, {file_url: '/uploads/files/p.png'}));
    const ctx = makeCtx();

    await upload.selectImage({target: {files: [png()]}}, ctx);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(UPLOAD_FILE_URL);
    expect(ctx.setUserImage).toHaveBeenLastCalledWith('/uploads/files/p.png');
    expect(ctx.setIsImageUploading).toHaveBeenLastCalledWith(false);
  });

  test('a refused picked image is named, and no image is left showing', async () => {
    window.pywebview = {api: macApi('D:\\p.png')};
    fetch.mockResolvedValue(reply(400, {error: 'invalid path', reason: 'path outside user dirs'}));
    const ctx = makeCtx();

    await upload.selectImage({target: {files: []}}, ctx);

    expect(ctx.notify.mock.calls[0][0].message).toContain('path outside user dirs');
    expect(ctx.setIsImageUploading).toHaveBeenLastCalledWith(false);
  });

  test('a rejected browser image upload is named, and the preview is cleared', async () => {
    fetch.mockResolvedValue(reply(413));
    const ctx = makeCtx();

    await upload.selectImage({target: {files: [png()]}}, ctx);

    expect(ctx.notify.mock.calls[0][0].type).toBe('error');
    expect(ctx.setUserImage).toHaveBeenLastCalledWith(null);
    expect(ctx.setIsImageUploading).toHaveBeenLastCalledWith(false);
  });
});
