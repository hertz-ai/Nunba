/* eslint-disable no-unused-vars */
import React, {useRef} from 'react';
import {Document, Page} from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import {ChevronLeft, ChevronRight} from 'lucide-react';

/**
 * PdfViewer — modal overlay for displaying an uploaded image or PDF.
 * Extracted from Demopage.js.
 */
const PdfViewer = ({
  uploadedImage,
  uploadedPdf,
  currentPage,
  numPages,
  scale,
  onDocumentLoadSuccess,
  onPrevPage,
  onNextPage,
  onClose,
  onImgError,
}) => {
  const containerRef = useRef(null);

  if (!uploadedImage && !uploadedPdf) return null;

  return (
    <div className="fixed top-5 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="relative bg-white p-4 rounded-lg shadow-lg w-[90%] max-w-4xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-gray-300 hover:bg-gray-400 rounded-full p-2"
        >
          ✕
        </button>

        {/* Image Display */}
        {uploadedImage && (
          <div className="w-full">
            <img
              src={uploadedImage}
              alt="Content Image"
              className={`${
                window.innerWidth <= 768 ? 'h-[60vh]' : 'h-[70vh]'
              } w-full object-contain rounded-lg`}
              onError={onImgError}
            />
          </div>
        )}

        {/* PDF Display */}
        {uploadedPdf && (
          <div
            ref={containerRef}
            className="relative w-full border-2 border-gray-200 rounded-lg flex justify-center items-center h-[75vh]"
          >
            <Document file={uploadedPdf} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                pageNumber={currentPage}
                scale={scale}
                className="flex justify-center items-center h-full"
              />
            </Document>

            {/* Pagination */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-full flex items-center">
              <button
                onClick={onPrevPage}
                className="px-3 py-2 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium px-2">
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={onNextPage}
                className="px-3 py-2 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
