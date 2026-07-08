import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, AlertCircle, Check } from 'lucide-react';

interface PreviewTableProps {
  headers: string[];
  rows: string[][];
  suggestedMappings: Record<string, string | null>;
  confidence: Record<string, number>;
  reasoning: string;
  onConfirm: (finalMapping: Record<string, string | null>) => void;
  onBack: () => void;
  isLoading: boolean;
}

const TARGET_FIELDS = [
  { name: 'first_name', label: 'First Name', required: false, description: 'First name of the lead contact' },
  { name: 'last_name', label: 'Last Name', required: false, description: 'Last name of the lead contact' },
  { name: 'email', label: 'Email Address', required: true, description: 'Email address of the lead contact' },
  { name: 'phone', label: 'Phone Number', required: false, description: 'Phone number of the lead contact' },
  { name: 'company', label: 'Company Name', required: false, description: 'Name of the company/organization' },
  { name: 'job_title', label: 'Job Title', required: false, description: 'Job position / title' },
  { name: 'estimated_value', label: 'Estimated Value', required: false, description: 'Potential deal value (numeric)' },
  { name: 'lead_status', label: 'Lead Status', required: false, description: 'Status: New, Contacted, Qualified, or Unqualified' },
  { name: 'notes', label: 'Notes / Description', required: false, description: 'Additional details or other unmapped columns' },
];

export default function PreviewTable({
  headers,
  rows,
  suggestedMappings,
  confidence,
  reasoning,
  onConfirm,
  onBack,
  isLoading,
}: PreviewTableProps) {
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Initialize mappings with suggestions from Gemini
  useEffect(() => {
    const initial: Record<string, string | null> = {};
    TARGET_FIELDS.forEach((f) => {
      initial[f.name] = suggestedMappings[f.name] || null;
    });
    setMappings(initial);
  }, [suggestedMappings]);

  // Compute live mapped preview data when mapping changes
  useEffect(() => {
    if (Object.keys(mappings).length === 0) return;

    const previewCount = rows.length;
    const mapped: any[] = [];

    const mappedCsvHeaders = new Set(Object.values(mappings).filter(Boolean));

    for (let r = 0; r < previewCount; r++) {
      const row = rows[r];
      // Convert row to object
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx] || '';
      });

      const lead: Record<string, any> = {};

      // Name Splitting logic preview
      const nameHeader = mappings['first_name'];
      const lastNameHeader = mappings['last_name'];

      if (nameHeader && nameHeader === lastNameHeader) {
        const fullName = (rowObj[nameHeader] || '').trim();
        const parts = fullName.split(/\s+/);
        lead['first_name'] = parts[0] || '';
        lead['last_name'] = parts.slice(1).join(' ') || '';
      } else {
        lead['first_name'] = mappings['first_name'] ? rowObj[mappings['first_name']!] : '';
        lead['last_name'] = mappings['last_name'] ? rowObj[mappings['last_name']!] : '';
      }

      lead['email'] = mappings['email'] ? rowObj[mappings['email']!] : '';
      lead['phone'] = mappings['phone'] ? rowObj[mappings['phone']!] : '';
      lead['company'] = mappings['company'] ? rowObj[mappings['company']!] : '';
      lead['job_title'] = mappings['job_title'] ? rowObj[mappings['job_title']!] : '';
      lead['estimated_value'] = mappings['estimated_value'] ? rowObj[mappings['estimated_value']!] : '';
      lead['lead_status'] = mappings['lead_status'] ? rowObj[mappings['lead_status']!] : 'New';

      // Assemble extra notes on-the-fly
      const extraNotes: string[] = [];
      headers.forEach((h) => {
        if (!mappedCsvHeaders.has(h) && rowObj[h]) {
          extraNotes.push(`${h}: ${rowObj[h]}`);
        }
      });
      const initialNotes = mappings['notes'] ? rowObj[mappings['notes']!] : '';
      lead['notes'] = [initialNotes, ...extraNotes].filter(Boolean).join(' | ');

      mapped.push(lead);
    }

    setPreviewRows(mapped);
  }, [mappings, rows, headers]);

  const handleMappingChange = (targetField: string, csvHeader: string) => {
    setMappings((prev) => ({
      ...prev,
      [targetField]: csvHeader === '__ignore__' ? null : csvHeader,
    }));
  };

  const isEmailMapped = !!mappings['email'];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Main Split Interface */}
      <div className="preview-grid">
        
        {/* Left Column: Field Mapper */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Configure Mapping</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Map your CSV headers to the target CRM fields</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {TARGET_FIELDS.map((field) => {
              const selectedValue = mappings[field.name] || '__ignore__';
              const conf = confidence[field.name];
              const isAiMapped = suggestedMappings[field.name] === mappings[field.name] && mappings[field.name] !== null;

              return (
                <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', gap: '0.25rem' }}>
                      {field.label}
                      {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    
                    {/* Confidence badge */}
                    {isAiMapped && conf !== undefined && (
                      <span 
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '0.25rem',
                          fontWeight: 700,
                          backgroundColor: conf > 0.8 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: conf > 0.8 ? 'var(--success)' : 'var(--warning)',
                          border: `1px solid ${conf > 0.8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                        }}
                      >
                        {Math.round(conf * 100)}% match
                      </span>
                    )}
                    
                    {!isAiMapped && mappings[field.name] !== null && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        Manual
                      </span>
                    )}
                  </div>
                  
                  <select 
                    value={selectedValue}
                    onChange={(e) => handleMappingChange(field.name, e.target.value)}
                    style={{
                      borderColor: selectedValue === '__ignore__' ? 'var(--border-color)' : 'rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    <option value="__ignore__">-- Ignore / Do Not Import --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{field.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Preview Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live Mapping Preview</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Showing real-time mapping of all rows</p>
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              padding: '0.4rem 0.8rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)'
            }}>
              Total Records: <strong style={{ color: 'var(--accent-cyan)' }}>{rows.length}</strong>
            </div>
          </div>

          {/* Live Grid */}
          <div className="table-scroll-container" style={{ border: '1px solid var(--glass-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                  {TARGET_FIELDS.map((f) => (
                    <th 
                      key={f.name} 
                      className="table-sticky-th"
                      style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                    >
                      {f.label} {f.required && '*'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {TARGET_FIELDS.map((f) => {
                      const val = row[f.name];
                      const isEmail = f.name === 'email';
                      const isPlaceholder = !val;
                      return (
                        <td key={f.name} style={{ 
                          padding: '1rem', 
                          color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '180px',
                          borderBottom: '1px solid rgba(255,255,255,0.02)'
                        }}>
                          {isPlaceholder ? (
                            <i>None</i>
                          ) : isEmail ? (
                            <span style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>{val}</span>
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!isEmailMapped && (
            <div
              className="fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--danger-glow)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
              <span>You must map the **Email Address** field (marked with *) before you can import leads.</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.5rem'
        }}
      >
        <button 
          className="btn btn-secondary" 
          onClick={onBack} 
          disabled={isLoading}
        >
          <ArrowLeft size={16} />
          Back to Upload
        </button>
        
        <button 
          className="btn btn-primary glow-cyan" 
          onClick={() => onConfirm(mappings)} 
          disabled={isLoading || !isEmailMapped}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: '1.1rem', height: '1.1rem' }}></div>
              <span>Processing Leads with AI...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Confirm & Start AI Import</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

