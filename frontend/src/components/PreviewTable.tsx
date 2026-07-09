import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, AlertCircle, Check } from 'lucide-react';
import { useVirtual } from '../hooks/useVirtual';

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
  { name: 'created_at', label: 'Created At', required: false, description: 'Lead creation date (JS parseable format)' },
  { name: 'name', label: 'Name', required: false, description: 'Full name of the lead contact' },
  { name: 'email', label: 'Email', required: false, description: 'Primary email address' },
  { name: 'country_code', label: 'Country Code', required: false, description: 'Phone country code (e.g. +91)' },
  { name: 'mobile_without_country_code', label: 'Mobile Number', required: false, description: 'Mobile number without country code' },
  { name: 'company', label: 'Company', required: false, description: 'Company name' },
  { name: 'city', label: 'City', required: false, description: 'City name' },
  { name: 'state', label: 'State', required: false, description: 'State name' },
  { name: 'country', label: 'Country', required: false, description: 'Country name' },
  { name: 'lead_owner', label: 'Lead Owner', required: false, description: 'Email address of the lead owner' },
  { name: 'crm_status', label: 'CRM Status', required: false, description: 'GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, or SALE_DONE' },
  { name: 'crm_note', label: 'CRM Note', required: false, description: 'Notes, remarks, extra phones/emails, or unmapped details' },
  { name: 'data_source', label: 'Data Source', required: false, description: 'leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots' },
  { name: 'possession_time', label: 'Possession Time', required: false, description: 'Property possession time' },
  { name: 'description', label: 'Description', required: false, description: 'Additional description' },
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

  const {
    containerRef,
    handleScroll,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
  } = useVirtual({
    totalCount: previewRows.length,
    estimateRowHeight: 53,
    buffer: 5,
  });

  const visibleRows = previewRows.slice(startIndex, endIndex + 1);

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

      TARGET_FIELDS.forEach((f) => {
        lead[f.name] = mappings[f.name] ? rowObj[mappings[f.name]!] : '';
      });

      // Default crm_status preview
      if (!lead['crm_status']) {
        lead['crm_status'] = 'GOOD_LEAD_FOLLOW_UP';
      }

      // Assemble extra notes on-the-fly
      const extraNotes: string[] = [];
      headers.forEach((h) => {
        if (!mappedCsvHeaders.has(h) && rowObj[h]) {
          extraNotes.push(`${h}: ${rowObj[h]}`);
        }
      });
      const initialNotes = mappings['crm_note'] ? rowObj[mappings['crm_note']!] : '';
      lead['crm_note'] = [initialNotes, ...extraNotes].filter(Boolean).join(' | ');

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

  const isAtLeastOneContactFieldMapped = !!mappings['email'] || !!mappings['mobile_without_country_code'];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Main Split Interface */}
      <div className="preview-grid">
        
        {/* Left Column: Field Mapper */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: 'calc(100vh - 290px)', overflowY: 'auto' }}>
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
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="table-scroll-container" 
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
              <table 
                style={{ 
                  width: '100%', 
                  borderCollapse: 'separate', 
                  borderSpacing: 0, 
                  fontSize: '0.85rem', 
                  textAlign: 'left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translateY(${offsetY}px)`
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#0f1524' }}>
                    {TARGET_FIELDS.map((f) => (
                      <th 
                        key={f.name} 
                        className="table-sticky-th"
                        style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
                      >
                         {f.name} {f.required && '*'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, idx) => {
                    const originalIdx = startIndex + idx;
                    return (
                      <tr key={originalIdx}>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {!isAtLeastOneContactFieldMapped && (
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
              <span>You must map either **Email** or **Mobile Number** to avoid all records being skipped.</span>
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
          disabled={isLoading || !isAtLeastOneContactFieldMapped}
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

