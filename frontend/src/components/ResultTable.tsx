import React, { useState } from 'react';
import { RotateCcw, Download, Search, CheckCircle, XCircle, Activity, FileJson, FileSpreadsheet } from 'lucide-react';
import { useVirtual } from '../hooks/useVirtual';

interface ResultTableProps {
  result: {
    metrics: {
      total: number;
      successCount: number;
      skippedCount: number;
      enrichmentRate: number;
    };
    results: Array<{
      status: 'success' | 'skipped';
      reason: string | null;
      lead: {
        created_at: string | null;
        name: string | null;
        email: string | null;
        country_code: string | null;
        mobile_without_country_code: string | null;
        company: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        lead_owner: string | null;
        crm_status: string | null;
        crm_note: string | null;
        data_source: string | null;
        possession_time: string | null;
        description: string | null;
      };
    }>;
  } | null;
  onReset: () => void;
}

const CRM_FIELDS_FOR_CSV = [
  'created_at',
  'name',
  'email',
  'country_code',
  'mobile_without_country_code',
  'company',
  'city',
  'state',
  'country',
  'lead_owner',
  'crm_status',
  'crm_note',
  'data_source',
  'possession_time',
  'description'
];

export default function ResultTable({ result, onReset }: ResultTableProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'skipped'>('success');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!result) return null;

  const { metrics, results } = result;

  const successfulLeads = results
    .filter((r) => r.status === 'success')
    .map((r) => r.lead);

  const skippedRecords = results.filter((r) => r.status === 'skipped');

  // Filter successful leads by search query
  const filteredSuccessLeads = successfulLeads.filter((lead) => {
    const fullName = (lead.name || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const company = (lead.company || '').toLowerCase();
    const city = (lead.city || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return (
      fullName.includes(query) ||
      email.includes(query) ||
      company.includes(query) ||
      city.includes(query)
    );
  });

  // Virtualization hooks
  const successVirtual = useVirtual({
    totalCount: filteredSuccessLeads.length,
    estimateRowHeight: 45,
    buffer: 5,
  });

  const skippedVirtual = useVirtual({
    totalCount: skippedRecords.length,
    estimateRowHeight: 45,
    buffer: 5,
  });

  const visibleSuccessLeads = filteredSuccessLeads.slice(successVirtual.startIndex, successVirtual.endIndex + 1);
  const visibleSkippedRecords = skippedRecords.slice(skippedVirtual.startIndex, skippedVirtual.endIndex + 1);

  const triggerCSVDownload = (data: any[], headers: string[], filename: string) => {
    const csvRows: string[] = [];
    
    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header];
        const stringVal = val === null || val === undefined ? '' : String(val);
        const escaped = stringVal.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerJSONDownload = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSuccessCSV = () => {
    triggerCSVDownload(successfulLeads, CRM_FIELDS_FOR_CSV, 'groweasy_imported_leads.csv');
  };

  const handleExportSuccessJSON = () => {
    triggerJSONDownload(successfulLeads, 'groweasy_imported_leads.json');
  };

  const handleExportSkippedCSV = () => {
    const flatSkipped = skippedRecords.map((r) => ({
      reason: r.reason,
      ...r.lead
    }));
    triggerCSVDownload(flatSkipped, ['reason', ...CRM_FIELDS_FOR_CSV], 'groweasy_skipped_leads.csv');
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header and Reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Import Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI processing results and analytics</p>
        </div>
        <button className="btn btn-secondary" onClick={onReset}>
          <RotateCcw size={16} />
          Import Another File
        </button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* Total Leads Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Total Leads Processed</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.total}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Activity size={14} />
            <span>100% of uploaded records</span>
          </div>
        </div>

        {/* Successfully Imported Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
          <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>Successfully Imported</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>{metrics.successCount}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--success)' }}>
            <CheckCircle size={14} />
            <span>{metrics.total > 0 ? Math.round((metrics.successCount / metrics.total) * 100) : 0}% success rate</span>
          </div>
        </div>

        {/* Skipped Leads Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderColor: metrics.skippedCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--glass-border)' }}>
          <p style={{ color: metrics.skippedCount > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Skipped Leads</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.skippedCount}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: metrics.skippedCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            <XCircle size={14} />
            <span>{metrics.total > 0 ? Math.round((metrics.skippedCount / metrics.total) * 100) : 0}% failure rate</span>
          </div>
        </div>

        {/* AI Enrichment Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderColor: 'rgba(139, 92, 246, 0.15)' }}>
          <p style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', fontWeight: 600 }}>AI Enrichment Rate</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>{metrics.enrichmentRate}%</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-purple)' }}>
            <Activity size={14} />
            <span>Standardized & enriched by Gemini</span>
          </div>
        </div>
      </div>

      {/* Tabs & Table Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Tab Controls and Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setActiveTab('success')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === 'success' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '1rem',
                fontWeight: 600,
                paddingBottom: '1rem',
                marginBottom: '-1rem',
                borderBottom: activeTab === 'success' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
            >
              Imported Leads ({metrics.successCount})
            </button>
            <button
              onClick={() => setActiveTab('skipped')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === 'skipped' ? 'var(--danger)' : 'var(--text-secondary)',
                fontSize: '1rem',
                fontWeight: 600,
                paddingBottom: '1rem',
                marginBottom: '-1rem',
                borderBottom: activeTab === 'skipped' ? '2px solid var(--danger)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
            >
              Skipped Records ({metrics.skippedCount})
            </button>
          </div>

          {/* Export Actions */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {activeTab === 'success' ? (
              <>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleExportSuccessCSV} disabled={metrics.successCount === 0}>
                  <FileSpreadsheet size={16} style={{ color: 'var(--success)' }} />
                  Export CSV
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleExportSuccessJSON} disabled={metrics.successCount === 0}>
                  <FileJson size={16} style={{ color: 'var(--accent-cyan)' }} />
                  Export JSON
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleExportSkippedCSV} disabled={metrics.skippedCount === 0}>
                <Download size={16} style={{ color: 'var(--danger)' }} />
                Download Failed Rows
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Successfully Imported */}
        {activeTab === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, overflow: 'hidden' }}>
            {/* Search filter */}
            <div style={{ position: 'relative', maxWidth: '350px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, email, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>

            {/* Table */}
            {filteredSuccessLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No imported leads found matching search.
              </div>
            ) : (
              <div 
                ref={successVirtual.containerRef}
                onScroll={successVirtual.handleScroll}
                className="table-scroll-container"
              >
                <div style={{ height: `${successVirtual.totalHeight}px`, width: '100%', position: 'relative' }}>
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
                      transform: `translateY(${successVirtual.offsetY}px)`
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#0f1524' }}>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>created_at</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>name</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>email</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>country_code</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>mobile_without_country_code</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>company</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>city</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>state</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>country</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>lead_owner</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>crm_status</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>crm_note</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>data_source</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>possession_time</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSuccessLeads.map((lead, idx) => {
                        const originalIdx = successVirtual.startIndex + idx;
                        return (
                          <tr key={originalIdx}>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.created_at || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.name || <i>Unnamed</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-cyan)', textDecoration: 'underline', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.email || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.country_code || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.mobile_without_country_code || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.company || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.city || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.state || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.country || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.lead_owner || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontWeight: 600,
                                  backgroundColor:
                                    lead.crm_status === 'SALE_DONE'
                                      ? 'rgba(16, 185, 129, 0.1)'
                                      : lead.crm_status === 'GOOD_LEAD_FOLLOW_UP'
                                      ? 'rgba(6, 182, 212, 0.1)'
                                      : lead.crm_status === 'BAD_LEAD'
                                      ? 'rgba(239, 68, 68, 0.1)'
                                      : 'rgba(245, 158, 11, 0.1)',
                                  color:
                                    lead.crm_status === 'SALE_DONE'
                                      ? 'var(--success)'
                                      : lead.crm_status === 'GOOD_LEAD_FOLLOW_UP'
                                      ? 'var(--accent-cyan)'
                                      : lead.crm_status === 'BAD_LEAD'
                                      ? 'var(--danger)'
                                      : 'var(--warning)',
                                }}
                              >
                                {lead.crm_status || 'GOOD_LEAD_FOLLOW_UP'}
                              </span>
                            </td>
                            <td style={{ 
                              padding: '0.75rem 1rem', 
                              color: 'var(--text-muted)',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              borderBottom: '1px solid rgba(255,255,255,0.02)'
                            }} title={lead.crm_note || ''}>
                              {lead.crm_note || <i>No notes</i>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.data_source || <i>None</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{lead.possession_time || <i>None</i>}</td>
                            <td style={{ 
                              padding: '0.75rem 1rem', 
                              color: 'var(--text-muted)',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              borderBottom: '1px solid rgba(255,255,255,0.02)'
                            }} title={lead.description || ''}>
                              {lead.description || <i>No description</i>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Skipped / Failed */}
        {activeTab === 'skipped' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, overflow: 'hidden' }}>
            {skippedRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No records skipped. All leads imported successfully!
              </div>
            ) : (
              <div 
                ref={skippedVirtual.containerRef}
                onScroll={skippedVirtual.handleScroll}
                className="table-scroll-container"
              >
                <div style={{ height: `${skippedVirtual.totalHeight}px`, width: '100%', position: 'relative' }}>
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
                      transform: `translateY(${skippedVirtual.offsetY}px)`
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#0f1524' }}>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--danger)' }}>Validation Error</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Raw Name</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Raw Email</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Raw Mobile</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Raw Company</th>
                        <th className="table-sticky-th" style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Raw Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSkippedRecords.map((item, idx) => {
                        const originalIdx = skippedVirtual.startIndex + idx;
                        return (
                          <tr key={originalIdx}>
                            <td style={{ padding: '0.75rem 1rem', color: '#f87171', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <XCircle size={14} />
                                <span>{item.reason || 'Validation Failed'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{item.lead.name || <i>Empty</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{item.lead.email || <i>Empty</i>}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              {item.lead.mobile_without_country_code ? `${item.lead.country_code || ''} ${item.lead.mobile_without_country_code}` : <i>Empty</i>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{item.lead.company || <i>Empty</i>}</td>
                            <td style={{ 
                              padding: '0.75rem 1rem', 
                              color: 'var(--text-muted)',
                              maxWidth: '250px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              borderBottom: '1px solid rgba(255,255,255,0.02)'
                            }} title={item.lead.crm_note || ''}>
                              {item.lead.crm_note || <i>None</i>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

