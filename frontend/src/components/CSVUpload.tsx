import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, FileText } from 'lucide-react';

interface CSVUploadProps {
  onUpload: (data: {
    headers: string[];
    rows: string[][];
    mappings: Record<string, string | null>;
    confidence: Record<string, number>;
    reasoning: string;
  }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function CSVUpload({ onUpload, isLoading, setIsLoading }: CSVUploadProps) {
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a valid CSV file (.csv)');
      return;
    }

    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('csv', file);

    try {
      const headers: Record<string, string> = {};
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/analyze-headers`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze CSV. Check your API key or server status.');
      }

      const result = await response.json();
      onUpload({
        headers: result.headers,
        rows: result.rows || [],
        mappings: result.mappings,
        confidence: result.confidence,
        reasoning: result.reasoning,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while uploading and analyzing the file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
          backgroundColor: isDragActive ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-secondary)',
          boxShadow: isDragActive ? '0 0 20px var(--accent-cyan-glow)' : 'none',
          padding: '4rem 2rem',
          borderRadius: '1rem',
          textAlign: 'center',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'var(--transition-smooth)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
        }}
        onClick={isLoading ? undefined : onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
            <p style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Analyzing CSV...</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Suggesting fields & mapping columns</p>
          </div>
        ) : (
          <>
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'var(--transition-smooth)',
              }}
            >
              <UploadCloud size={36} style={{ color: 'var(--accent-cyan)' }} />
            </div>

            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Drag & drop your CSV file here
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                or <span style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>browse files</span> on your computer
              </p>
            </div>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '0.4rem 0.8rem',
              borderRadius: '2rem',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <FileText size={14} />
              <span>Supports files up to 5MB</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div
          className="fade-in"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--danger)' }} />
          <div>
            <p style={{ fontWeight: 600, marginBottom: '0.1rem' }}>Upload Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

