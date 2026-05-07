import React, { useEffect, useMemo, useState, useRef } from 'react';
import gsap from 'gsap';

const STATUSES = ['new'];
const DATE_FILTERS = ['today', 'yesterday', 'week'];

const Loader = () => {
  const containerRef = useRef();
  const circleRef = useRef();

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(circleRef.current, {
      scale: 1.5,
      opacity: 0.5,
      duration: 0.8,
      ease: 'power1.inOut'
    }).to(circleRef.current, {
      scale: 1,
      opacity: 1,
      duration: 0.8,
      ease: 'power1.inOut'
    });

    gsap.to(containerRef.current, {
      rotate: 360,
      duration: 2,
      repeat: -1,
      ease: 'none'
    });
  }, []);

  return (
    <div className="loader-overlay">
      <div ref={containerRef} className="loader-container">
        <div ref={circleRef} className="loader-circle"></div>
      </div>
      <div className="loader-text">Fetching latest jobs...</div>
    </div>
  );
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  }
}

export function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [resume, setResume] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const selected = useMemo(
    () => jobs.find((j) => j._id === selectedId) || null,
    [jobs, selectedId]
  );

  async function loadAll() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [jobsRes, resumeRes] = await Promise.all([
        fetch(`/api/jobs${qs}`),
        fetch('/api/resume')
      ]);
      const [{ jobs }, { resume }] = await Promise.all([
        jobsRes.json(),
        resumeRes.json()
      ]);
      setJobs(jobs || []);
      setResume(resume || null);
      if (!selectedId && jobs?.[0]?._id) setSelectedId(jobs[0]._id);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter]);

  async function runPipeline() {
    setBusy(true);
    setNotice('');
    try {
      const r = await fetch('/api/pipeline/run', { method: 'POST' });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.error || 'pipeline_failed');
      }
      setNotice('Pipeline finished. Fetching results...');
      await loadAll();
      setNotice('Pipeline finished and list updated.');
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!confirm('Are you sure you want to delete ALL jobs from the database?')) return;
    setBusy(true);
    try {
      await fetch('/api/jobs', { method: 'DELETE' });
      setJobs([]);
      setSelectedId(null);
      setNotice('All jobs cleared.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(jobId, status) {
    setNotice('');
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'status_update_failed');
    const { job } = data;
    setJobs((prev) => prev.map((j) => (j._id === job._id ? job : j)));
    setNotice('Status updated.');
  }

  async function applyNow(job) {
    // 1. Copy AI message to clipboard if available
    const msg = job?.ai?.message;
    let copied = false;
    if (msg) {
      copied = await copyToClipboard(msg);
    }
    // 2. Open apply URL in new tab
    if (job?.applyUrl) {
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    }
    // 3. Mark as applied
    await updateStatus(job._id, 'applied');
    setNotice(
      copied
        ? '✅ Opened apply page + AI message copied to clipboard! Paste it in the application form.'
        : '✅ Opened apply page. Status marked as applied.'
    );
  }

  const shortlistedCount = useMemo(
    () => jobs.filter((j) => j.status === 'shortlisted').length,
    [jobs]
  );

  function sendToWhatsApp() {
    const shortlisted = jobs.filter((j) => j.status === 'shortlisted');
    if (shortlisted.length === 0) {
      setNotice('No shortlisted jobs to send.');
      return;
    }
    const lines = [
      `🎯 *Job Hunter — ${shortlisted.length} Shortlisted Job${shortlisted.length > 1 ? 's' : ''}*`,
      ''
    ];
    shortlisted.forEach((j, i) => {
      lines.push(`*${i + 1}. ${j.title}*`);
      if (j.company) lines.push(`🏢 ${j.company}`);
      if (j.location) lines.push(`📍 ${j.location}`);
      lines.push(`📊 ATS Score: ${j.ats?.score ?? 0}%`);
      if (j.ai?.message) lines.push(`✉️ _AI Message ready_`);
      lines.push(`🔗 ${j.applyUrl}`);
      lines.push('');
    });
    lines.push('_Sent from Job Hunter Dashboard_');
    const text = encodeURIComponent(lines.join('\n'));
    const waUrl = `https://wa.me/919149357330?text=${text}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setNotice('📱 Opening WhatsApp — tap Send to message yourself!');
  }

  async function saveResume(next) {
    setNotice('');
    const res = await fetch('/api/resume', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'resume_save_failed');
    setResume(data.resume);
    setNotice('Resume saved.');
  }

  async function uploadResume(file) {
    setNotice('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/resume/upload', {
      method: 'POST',
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'upload_failed');
    setResume(data.resume);
    setNotice('Resume uploaded.');
  }

  return (
    <div className="page">
      {busy && <Loader />}
      <header className="topbar">
        <div>
          <div className="title">
            Job Hunter Dashboard
            {shortlistedCount > 0 && (
              <span className="badge-shortlisted">{shortlistedCount} shortlisted 🎯</span>
            )}
          </div>
          <div className="subtitle">Scrape → filter → score → message → apply</div>
          {notice ? <div className="notice">{notice}</div> : null}
        </div>
        <div className="actions">
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="">All Dates</option>
            {DATE_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <button className="button primary" onClick={runPipeline} disabled={busy}>
            {busy ? 'Running...' : 'Run pipeline'}
          </button>
          {shortlistedCount > 0 && (
            <button className="button whatsapp-btn" onClick={sendToWhatsApp} disabled={busy}>
              📱 Send {shortlistedCount} to WhatsApp
            </button>
          )}
          <button className="button" onClick={loadAll} disabled={busy}>
            {busy ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="button danger" onClick={clearAll} disabled={busy}>
            Clear all
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panelHeader">Jobs</div>
          <div className="list">
            {jobs.map((j) => (
              <button
                key={j._id}
                className={`listItem ${j._id === selectedId ? 'active' : ''} ${j.status === 'shortlisted' ? 'shortlisted-item' : ''}`}
                onClick={() => setSelectedId(j._id)}
              >
                <div className="row">
                  <div className="jobTitle">{j.title}</div>
                  <div className={`pill ${j.status}`}>{j.status}</div>
                </div>
                <div className="meta">
                  <span className={`source-tag ${j.source}`}>{j.source}</span>
                  <span className="dot">•</span>
                  <span>{j.company || '—'}</span>
                  <span className="dot">•</span>
                  <span>{j.location || '—'}</span>
                  <span className="dot">•</span>
                  <span>ATS {j.ats?.score ?? 0}%</span>
                </div>
                {j.status === 'shortlisted' && (
                  <div
                    className="apply-inline-btn"
                    onClick={(e) => { e.stopPropagation(); applyNow(j); }}
                  >
                    ⚡ Apply Now
                  </div>
                )}
              </button>
            ))}
            {jobs.length === 0 ? (
              <div className="empty">No jobs yet. Run the pipeline.</div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">Job details</div>
          {selected ? (
            <div className="details">
              <div className="detailsTop">
                <div>
                  <div className="detailsTitle">{selected.title}</div>
                  <div className="meta">
                    <span>{selected.company || '—'}</span>
                    <span className="dot">•</span>
                    <span>{selected.location || '—'}</span>
                    <span className="dot">•</span>
                    <span className={`source-tag ${selected.source}`}>{selected.source}</span>
                  </div>
                </div>
                <div className="detailsActions">
                  <select
                    className="select"
                    value={selected.status}
                    onChange={(e) => updateStatus(selected._id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {selected.status === 'shortlisted' ? (
                    <button
                      className="button apply-now-btn"
                      onClick={() => applyNow(selected)}
                    >
                      ⚡ Apply Now
                      {selected.ai?.message ? ' + Copy Message' : ''}
                    </button>
                  ) : null}
                  <a className="button" href={selected.applyUrl} target="_blank" rel="noreferrer">
                    Open page
                  </a>
                </div>
              </div>

              <div className="cards">
                <div className="card">
                  <div className="cardTitle">Filter</div>
                  <div className="small">
                    Passed: <b>{String(!!selected.filter?.passed)}</b>
                  </div>
                  <div className="small">
                    Reasons:{' '}
                    {(selected.filter?.reasons || []).length
                      ? selected.filter.reasons.join(', ')
                      : '—'}
                  </div>
                </div>
                <div className="card">
                  <div className="cardTitle">ATS</div>
                  <div className="small">
                    Score: <b>{selected.ats?.score ?? 0}%</b>
                  </div>
                  <div className="small">
                    Keywords: {(selected.ats?.keywords || []).slice(0, 12).join(', ') || '—'}
                  </div>
                </div>
              </div>

              <div className="split">
                <div>
                  <div className="sectionTitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    AI message
                    {selected.ai?.message && (
                      <button
                        className="button copy-btn"
                        onClick={() => copyToClipboard(selected.ai.message).then(() => setNotice('📋 AI message copied to clipboard!'))}
                      >
                        📋 Copy
                      </button>
                    )}
                  </div>
                  <textarea
                    className="textarea"
                    readOnly
                    value={selected.ai?.message || 'No message yet. Add a valid OPENAI_API_KEY and rerun the pipeline.'}
                  />
                </div>
                <div>
                  <div className="sectionTitle">Description</div>
                  <textarea className="textarea" readOnly value={selected.description || '—'} />
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Select a job.</div>
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">Resume</div>
          <ResumeEditor
            resume={resume}
            onSave={saveResume}
            onUpload={uploadResume}
            onError={(msg) => setNotice(String(msg || 'Something went wrong.'))}
          />
        </section>
      </main>
    </div>
  );
}

function ResumeEditor({ resume, onSave, onUpload, onError }) {
  const [draft, setDraft] = useState(
    resume || { name: '', headline: '', location: '', yearsOfExperience: 0, skills: [], text: '' }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef(null);

  useEffect(() => {
    if (resume) setDraft(resume);
  }, [resume]);

  function setField(k, v) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: draft.name || '',
        headline: draft.headline || '',
        location: draft.location || '',
        yearsOfExperience: Number(draft.yearsOfExperience || 0),
        skills: Array.isArray(draft.skills)
          ? draft.skills
          : String(draft.skills || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        text: draft.text || ''
      };
      await onSave(payload);
    } catch (e) {
      onError?.(e?.message || 'resume_save_failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      onError?.(err?.message || 'upload_failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="resume">
      <div className="row2" style={{ gridTemplateColumns: '1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>
            Upload & Parse Resume (PDF/DOCX/TXT)
          </label>
          <input
            ref={fileRef}
            className="input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading && <div style={{ fontSize: '11px', color: 'var(--brand)' }}>Uploading and parsing...</div>}
        </div>
      </div>
      <div className="row2">
        <input
          className="input"
          placeholder="Name"
          value={draft.name || ''}
          onChange={(e) => setField('name', e.target.value)}
        />
        <input
          className="input"
          placeholder="Location"
          value={draft.location || ''}
          onChange={(e) => setField('location', e.target.value)}
        />
      </div>
      <input
        className="input"
        placeholder="Headline"
        value={draft.headline || ''}
        onChange={(e) => setField('headline', e.target.value)}
      />
      <div className="row2">
        <input
          className="input"
          placeholder="Skills (comma-separated)"
          value={Array.isArray(draft.skills) ? draft.skills.join(', ') : draft.skills || ''}
          onChange={(e) => setField('skills', e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          max="50"
          placeholder="Years"
          value={draft.yearsOfExperience ?? 0}
          onChange={(e) => setField('yearsOfExperience', e.target.value)}
        />
      </div>
      <textarea
        className="textarea"
        placeholder="Paste resume text here (used for ATS matching)"
        value={draft.text || ''}
        onChange={(e) => setField('text', e.target.value)}
      />
      <button className="button primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save resume'}
      </button>
    </div>
  );
}

