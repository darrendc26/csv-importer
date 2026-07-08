'use client';

import React, { useState, useEffect } from 'react';
import CSVUpload from '../components/CSVUpload';
import PreviewTable from '../components/PreviewTable';
import ResultTable from '../components/ResultTable';


export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, string | null>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [reasoning, setReasoning] = useState<string>('');
  const [resultData, setResultData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  


  const handleUpload = (data: {
    headers: string[];
    rows: string[][];
    mappings: Record<string, string | null>;
    confidence: Record<string, number>;
    reasoning: string;
  }) => {
    setHeaders(data.headers);
    setRows(data.rows);
    setSuggestedMappings(data.mappings);
    setConfidence(data.confidence);
    setReasoning(data.reasoning);
    setStep(2);
  };

  const handleConfirmImport = async (finalMapping: Record<string, string | null>) => {
    setIsLoading(true);
    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/import`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          headers,
          rows,
          mapping: finalMapping,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import and clean records.');
      }

      const result = await response.json();
      setResultData(result);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during import.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setHeaders([]);
    setRows([]);
    setSuggestedMappings({});
    setConfidence({});
    setReasoning('');
    setResultData(null);
    setStep(1);
    setIsLoading(false);
  };

  return (
    <main style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Navbar */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.25rem'
          }}>
            G
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              GrowEasy Importer <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>AI v2.5</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Intelligent CRM CSV importer engine</p>
          </div>
        </div>

      </header>

      {/* Main Stepper Layout */}
      {step === 1 && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '650px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 30%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI-Powered CRM Lead Importer
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Drag & drop any CSV file. Gemini AI will analyze, map, clean, and enrich your records into the standard GrowEasy CRM format instantly.
            </p>
          </div>
          
          <CSVUpload 
            onUpload={handleUpload} 
            isLoading={isLoading} 
            setIsLoading={setIsLoading}
          />
        </div>
      )}

      {step === 2 && (
        <PreviewTable 
          headers={headers}
          rows={rows}
          suggestedMappings={suggestedMappings}
          confidence={confidence}
          reasoning={reasoning}
          onConfirm={handleConfirmImport} 
          onBack={() => setStep(1)} 
          isLoading={isLoading}
        />
      )}

      {step === 3 && (
        <ResultTable 
          result={resultData} 
          onReset={handleReset} 
        />
      )}

      {/* Sticky Step Progress Indicator */}
      <footer style={{ 
        marginTop: 'auto', 
        borderTop: '1px solid var(--border-color)', 
        paddingTop: '1.5rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '2.5rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: step >= 1 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
          <span style={{ 
            width: '1.25rem', 
            height: '1.25rem', 
            borderRadius: '50%', 
            border: `1px solid ${step >= 1 ? 'var(--accent-cyan)' : 'var(--text-muted)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700
          }}>1</span>
          <span style={{ fontWeight: step === 1 ? 700 : 500 }}>Upload CSV</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: step >= 2 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
          <span style={{ 
            width: '1.25rem', 
            height: '1.25rem', 
            borderRadius: '50%', 
            border: `1px solid ${step >= 2 ? 'var(--accent-cyan)' : 'var(--text-muted)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700
          }}>2</span>
          <span style={{ fontWeight: step === 2 ? 700 : 500 }}>Map & Preview</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: step >= 3 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
          <span style={{ 
            width: '1.25rem', 
            height: '1.25rem', 
            borderRadius: '50%', 
            border: `1px solid ${step >= 3 ? 'var(--accent-cyan)' : 'var(--text-muted)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700
          }}>3</span>
          <span style={{ fontWeight: step === 3 ? 700 : 500 }}>Import Dashboard</span>
        </div>
      </footer>
    </main>
  );
}

