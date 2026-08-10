import React from 'react';

/**
 * ConflictDiffModal
 * Shown when sync detects server data changed while device was offline.
 * Presents two options: Keep Local or Accept Server
 */
export default function ConflictDiffModal({ conflict, onKeepLocal, onAcceptServer, onClose }) {
  if (!conflict) return null;

  const { client_data, server_data, type } = conflict;
  const typeLabel = type === 'pending_farmers' ? 'Farmer Registration'
    : type === 'pending_form2a' ? 'Seasonal Farm Info (Form 2a)'
    : 'Farm Visit Log (Form 2b)';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
    }}>
      <div style={{
        background: '#1a1f2e', borderRadius: '20px', padding: '2rem',
        width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid rgba(255,165,0,0.4)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2rem' }}>⚡</span>
          <div>
            <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              Sync Conflict Detected
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
              {typeLabel} — server data was updated while you were offline
            </p>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Someone updated this record on the server while your device was offline.
          Choose which version to keep:
        </p>

        {/* Side-by-side comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Local Version */}
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px', padding: '1rem',
          }}>
            <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              📱 YOUR LOCAL VERSION
            </div>
            <DataDisplay data={client_data} />
          </div>

          {/* Server Version */}
          <div style={{
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px', padding: '1rem',
          }}>
            <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              🌐 SERVER VERSION
            </div>
            <DataDisplay data={server_data} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            onClick={onKeepLocal}
            style={{
              padding: '0.85rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            📱 Keep My Local Version
          </button>
          <button
            onClick={onAcceptServer}
            style={{
              padding: '0.85rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            🌐 Accept Server Version
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', marginTop: '0.75rem',
            padding: '0.6rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem',
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
          }}
        >
          Decide Later
        </button>
      </div>
    </div>
  );
}

// ─── Helper: render data fields cleanly ───
function DataDisplay({ data }) {
  if (!data) return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No data</div>;

  const relevantKeys = ['name', 'crop', 'area', 'season_name', 'visit_notes', 'sowing_date', 'location', 'contact', 'updated_at'];

  return (
    <div style={{ fontSize: '0.8rem' }}>
      {relevantKeys.map(key => {
        if (!data[key]) return null;
        return (
          <div key={key} style={{ marginBottom: '0.4rem', color: 'rgba(255,255,255,0.8)' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>
              {key.replace(/_/g, ' ')}:
            </span>{' '}
            {String(data[key])}
          </div>
        );
      })}
    </div>
  );
}
