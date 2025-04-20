import React, { useState } from 'react';

export function UploadPropertyCSV({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('http://localhost:8000/properties/upload-csv', {
      method: 'POST',
      body: form,
    });

    const result = await res.json();
    setStatus(result.message);
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <div className="my-6 bg-white p-4 rounded shadow space-y-2">
      <h3 className="font-bold text-lg">Upload Properties (CSV)</h3>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
        className="border p-1"
      />
      <button
        className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        onClick={handleUpload}
      >
        Upload
      </button>
      {status && <div className="text-sm text-green-600">{status}</div>}
    </div>
  );
}
export default UploadPropertyCSV;