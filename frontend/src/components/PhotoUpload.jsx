import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, X } from 'lucide-react';

const PhotoUpload = ({ files, onFilesChange }) => {
  const onDrop = useCallback(acceptedFiles => {
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

  const removeFile = (fileToRemove) => {
    URL.revokeObjectURL(fileToRemove.preview); // Clean up memory
    onFilesChange(files.filter(file => file !== fileToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    maxFiles: 5,
  });

  return (
    <div>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          <Camera className="w-8 h-8 text-gray-400 mb-2" />
          {isDragActive ?
            <p className="text-blue-600">Drop the files here ...</p> :
            <p className="text-gray-600">Drag & drop photos here, or click to select</p>
          }
          <p className="text-xs text-gray-500 mt-1">Up to 5 images</p>
        </div>
      </div>
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group aspect-square">
              <img src={file.preview} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md" />
              <button
                onClick={() => removeFile(file)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
