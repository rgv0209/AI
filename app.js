/**
 * BatteryAI App Logic
 * BULLETPROOF Groq API Integration with Auto-Fallback Models
 */

const state = {
  battery: 75,
  drainRate: 8,
  profile: 'Standby',
  remainingTime: 0,
  history: JSON.parse(localStorage.getItem('batteryHistory') || '[]'),
  simActive: false,
  simInterval: null,
  simAccelFactor: 1000
};

let els = {};
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  els = {
    slider: document.getElementById('sliderBattery'),
    sliderBadge: document.getElementById('sliderBadge'),
    inputDrain: document.getElementById('inputDrain'),
    bwFill: document.getElementById('bwFill'),
    bwPct: document.getElementById('bwPct'),
    bwGlow: document.getElementById('bwGlow'),
    statRemTime: document.getElementById('statRemTime'),
    statStatus: document.getElementById('statStatus'),
    resultNum: document.getElementById('resultNum'),
    resultSub: document.getElementById('resultSub'),
    apiKey: document.getElementById('apiKey'),
    toast: document.getElementById('toast'),
    aiOutput: document.getElementById('aiOutput'),
    aiPillText: document.getElementById('aiPillText'),
    aiPillDot: document.getElementById('aiPill'),
    liveTime: document.getElementById('liveTime')
  };

  initParticles();
  updateTime();
  setInterval(updateTime, 1000);

  const savedKey = localStorage.getItem('groqKey');
  if (savedKey && els.apiKey) els.apiKey.value = savedKey;

  onSliderChange(state.battery);
  liveUpdate();
  renderHistory();
  initChart();

  document.querySelectorAll('.nav-tab').forEach(btn =>
    btn.addEventListener('click', e => switchTab(e.target.dataset.tab))
  );
});

function updateTime() {
  if (els.liveTime) {
    els.liveTime.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  const view = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add('active');
  if (view) view.classList.add('active');
}

function onSliderChange(val) {
  state.battery = parseFloat(val);
  if (els.sliderBadge) els.sliderBadge.innerText = state.battery + '%';
  if (els.bwPct) els.bwPct.innerText = state.battery + '%';
  if (els.bwFill) els.bwFill.style.height = state.battery + '%';

  let color = 'var(--success)';
  let status = 'Good';
  if (state.battery < 20) { color = 'var(--danger)'; status = 'Critical'; }
  else if (state.battery < 50) { color = 'var(--warning)'; status = 'Fair'; }

  if (els.bwFill) els.bwFill.style.background = `linear-gradient(to top, ${color}, transparent)`;
  if (els.bwGlow) els.bwGlow.style.background = color;
  if (els.statStatus) els.statStatus.innerText = status;
  liveUpdate();
}

function setProfile(btnEl) {
  document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  state.profile = btnEl.dataset.profile;
  state.drainRate = parseFloat(btnEl.dataset.drain);
  if (els.inputDrain) els.inputDrain.value = state.drainRate;
  liveUpdate();
}

function liveUpdate() {
  if (els.inputDrain) state.drainRate = parseFloat(els.inputDrain.value) || 0.1;
  if (state.drainRate > 0) state.remainingTime = state.battery / state.drainRate;
}

function toggleKey() {
  if (els.apiKey) els.apiKey.type = els.apiKey.type === 'password' ? 'text' : 'password';
}

// ==================== CALCULATE ====================
function calculate() {
  liveUpdate();
  const time = state.remainingTime.toFixed(1);

  if (els.statRemTime) els.statRemTime.innerText = time + 'h';
  if (els.resultNum) els.resultNum.innerText = time;

  const end = new Date();
  end.setMinutes(end.getMinutes() + state.remainingTime * 60);
  const fmt = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = fmt.format(end);

  if (els.resultSub) els.resultSub.innerText = 'Battery dies around ' + timeStr;

  const statsEl = document.getElementById('resultStats');
  if (statsEl) {
    statsEl.style.display = 'grid';
    document.getElementById('rs1').innerText = state.battery + '%';
    document.getElementById('rs2').innerText = state.drainRate + '%/h';
    document.getElementById('rs3').innerText = timeStr;
    document.getElementById('rs4').innerText = state.profile;
  }

  const hWrap = document.getElementById('healthBarWrap');
  if (hWrap) {
    hWrap.style.display = 'block';
    const hf = document.getElementById('healthFill');
    hf.style.width = state.battery + '%';
    hf.style.background = state.battery > 50 ? 'var(--success)' : state.battery > 20 ? 'var(--warning)' : 'var(--danger)';
  }

  generateChartData();

  const entry = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    battery: state.battery,
    drain: state.drainRate,
    profile: state.profile,
    rem: time
  };
  state.history.unshift(entry);
  if (state.history.length > 20) state.history.pop();
  localStorage.setItem('batteryHistory', JSON.stringify(state.history));
  renderHistory();

  showToast('✅ Trajectory Calculated');
}

// ==================== CHART ====================
function initChart() {
  const c = document.getElementById('mainChart');
  if (!c) return;
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Outfit', sans-serif";
  chartInstance = new Chart(c.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', padding: 12, cornerRadius: 8 } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function generateChartData() {
  if (!chartInstance) return;
  const labels = [], data = [];
  let cur = state.battery, h = 0;
  while (cur > 0) {
    labels.push(h === 0 ? 'Now' : '+' + h + 'h');
    data.push(Math.max(0, cur));
    cur -= state.drainRate;
    h++;
  }
  if (!data.length || data[data.length - 1] > 0) {
    labels.push('+' + h + 'h');
    data.push(0);
  }
  chartInstance.data.labels = labels;
  chartInstance.data.datasets = [{
    label: 'Battery %',
    data,
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderWidth: 3,
    fill: true,
    tension: 0.4,
    pointBackgroundColor: '#ec4899'
  }];
  chartInstance.update();
}

// ==================== GROQ AI — BULLETPROOF FALLBACK ====================
async function getAIInsights() {
  const keyEl = document.getElementById('apiKey');
  const key = keyEl ? keyEl.value.trim() : '';

  if (!key) {
    showToast('⚠️ Please enter your Groq API key first');
    return;
  }
  localStorage.setItem('groqKey', key);

  const aiBtn = document.getElementById('aiBtn');
  if (aiBtn) { aiBtn.disabled = true; aiBtn.innerHTML = '<span class="btn-ico">⏳</span> Connecting to Groq...'; }
  if (els.aiPillText) els.aiPillText.innerText = 'Connecting...';
  if (els.aiPillDot) els.aiPillDot.classList.add('online');

  if (els.aiOutput) {
    els.aiOutput.innerHTML = `
      <div class="ai-placeholder">
        <div class="ai-ph-icon" style="color:var(--primary)">🧠</div>
        <p>Routing to most capable active LLM server securely...</p>
      </div>`;
  }

  // Define an array of models. If one is deprecated/offline, it will dynamically fall back to the next!
  const robustModelCascade = [
    'llama3-8b-8192',         // Fast, default reliable model
    'llama-3.1-8b-instant',   // Latest LLaMA fallback
    'llama3-70b-8192',        // Heavy reliable model
    'gemma2-9b-it'            // Google Gemma fallback
  ];

  let success = false;
  let finalError = "";
  let data = null;

  for (const modelToTry of robustModelCascade) {
    try {
      console.log(`Sending payload to: ${modelToTry}`);
      
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: modelToTry,
          messages: [
            { role: 'system', content: 'You are an advanced AI Battery Telemetry Engine. Your unique job is to deliver a highly technical "Predictive AI Diagnostic Report". Do NOT give basic advice like "turn down brightness". Use advanced forensic engineering and machine learning terminology. Structure your response into exactly three sections: 1) [AI Context Analysis] 2) [Hardware Anomaly Detection] 3) [Advanced Kernel/OS Mitigations]. Use **bold** text for key metrics.' },
            { role: 'user', content: `Run AI Simulation Sequence on the following real-time telemetry:\n- SoC Capacity: ${state.battery}%\n- Discharge Velocity: ${state.drainRate}%/hr\n- Applied Workload: ${state.profile}\n\nDo not calculate the remaining hours (dashboard handles this). Output your 3-part diagnostic report. Include hypothetical confidence percentages, theorize on thermal decay vectors (CPU/GPU), and give highly advanced, profile-specific mitigations.` }
          ],
          temperature: 0.5,
          max_tokens: 400
        })
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        let errMsg = e.error?.message || res.statusText;
        
        if (res.status === 401) {
          throw new Error('Invalid API Key. Please ensure it starts with "gsk_"');
        }
        
        console.warn(`[!] Model ${modelToTry} failed: ${errMsg}. Trying next...`);
        finalError = errMsg;
        continue; // Try the next model!
      }

      data = await res.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Empty response from Groq');
      }
      
      // If we got here, it WORKED!
      success = true;
      
      // Update UI with the active model that actually served the request
      document.querySelectorAll('.model-tag').forEach(tag => tag.innerText = modelToTry);
      
      break; // Exit the loop entirely

    } catch (err) {
      if(err.message.includes("Invalid API Key")) {
        finalError = err.message;
        break; // Don't keep retrying if the key is just flat out bad
      }
      console.warn(`[!] Loop catch for ${modelToTry}: ${err.message}`);
      finalError = err.message;
    }
  }


  if (success && data) {
    const text = data.choices[0].message.content;

    if (els.aiOutput) {
      let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      els.aiOutput.innerHTML = `<div class="ai-message">${html}</div>`;
    }
    
    if (els.aiPillText) els.aiPillText.innerText = 'AI Ready';
    showToast('✅ AI Analysis Complete');
    calculate();
  } else {
    // TOTAL FAILURE (all models rejected or key is bad)
    console.error('Groq Total Failure:', finalError);
    if (els.aiOutput) {
      els.aiOutput.innerHTML = `
        <div style="padding:2rem;text-align:center;">
          <div style="font-size:2rem;margin-bottom:1rem;">❌</div>
          <div style="color:var(--danger);font-weight:600;margin-bottom:0.5rem;font-size:1.1rem;">API Connection Failed</div>
          <div style="color:var(--text-muted);line-height:1.6;font-size:0.95rem;">
            <strong>Error:</strong> ${finalError}<br><br>
            <strong>Bulletproof Troubleshooting:</strong><br>
            • Your key might be blocked/empty — Ensure it starts with <code>gsk_</code><br>
            • Create a fresh key instantly at <a href="https://console.groq.com/keys" target="_blank" style="color:var(--primary)">console.groq.com/keys</a>
          </div>
        </div>`;
    }
    if (els.aiPillText) els.aiPillText.innerText = 'Offline';
    if (els.aiPillDot) els.aiPillDot.classList.remove('online');
  }

  // Always re-enable button
  if (aiBtn) {
    aiBtn.disabled = false;
    aiBtn.innerHTML = '<span class="btn-ico">🤖</span> Generate AI Insights';
  }
}

// ==================== SIMULATION ====================
const simState = { battery: 0, elapsed: 0 };
let simChartInst = null;

function startSim() {
  if (state.simActive) return;
  state.simActive = true;
  const btn = document.getElementById('simStartBtn');
  if (btn) btn.innerHTML = '⏸ Simulating...';

  liveUpdate();
  simState.battery = state.battery;
  simState.elapsed = 0;

  const sd = document.getElementById('simDrain');
  if (sd) sd.innerText = `${state.drainRate}%/hr`;

  const sc = document.getElementById('simChart');
  if (!simChartInst && sc) {
    simChartInst = new Chart(sc.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Batt %', data: [], borderColor: '#ec4899', fill: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, animation: false }
    });
  }

  if (simChartInst) {
    simChartInst.data.labels = [0];
    simChartInst.data.datasets[0].data = [simState.battery];
    simChartInst.update();
  }

  state.simInterval = setInterval(() => {
    const secs = (100 * state.simAccelFactor) / 1000;
    simState.elapsed += secs;
    simState.battery -= (state.drainRate / 3600) * secs;

    if (simState.battery <= 0) {
      simState.battery = 0;
      clearInterval(state.simInterval);
      state.simActive = false;
      const b = document.getElementById('simStartBtn');
      if (b) b.innerHTML = '🏁 Depleted!';
    }
    updateSimUI();
  }, 100);
}

function updateSimUI() {
  const pct = Math.max(0, simState.battery).toFixed(1);
  const f = document.getElementById('simFill');
  if (f) {
    f.style.height = `${pct}%`;
    f.style.background = pct > 20 ? 'var(--success)' : 'var(--danger)';
  }

  const sp = document.getElementById('simPct');
  if (sp) sp.innerText = `${Math.floor(pct)}%`;

  const sl = document.getElementById('simLevel');
  if (sl) sl.innerText = `${pct}%`;

  const min = Math.floor(simState.elapsed / 60);
  const hrs = Math.floor(min / 60);
  const rm = min % 60;
  const se = document.getElementById('simElapsed');
  if (se) se.innerText = hrs > 0 ? `${hrs}h ${rm}m` : `${min}m`;

  if (simChartInst && simState.battery > 0 && Math.random() > 0.8) {
    simChartInst.data.labels.push(min);
    simChartInst.data.datasets[0].data.push(parseFloat(pct));
    simChartInst.update();
  }
}

function resetSim() {
  if (state.simInterval) clearInterval(state.simInterval);
  state.simActive = false;
  const b = document.getElementById('simStartBtn');
  if (b) b.innerHTML = '▶ Start Simulation';

  const sp = document.getElementById('simPct');
  if (sp) sp.innerText = '—';

  const sf = document.getElementById('simFill');
  if (sf) sf.style.height = '0%';

  if (simChartInst) {
    simChartInst.data.labels = [];
    simChartInst.data.datasets[0].data = [];
    simChartInst.update();
  }
}

// ==================== HISTORY ====================
function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  if (!state.history.length) {
    list.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">No predictions yet.</div>';
    return;
  }
  list.innerHTML = state.history.map(i => `
    <div class="history-item">
      <div class="hi-left">
        <span class="hi-date">${i.date} at ${i.time}</span>
        <span class="hi-params">⚡ ${i.battery}% @ -${i.drain}%/hr</span>
        <span class="hi-profile">${i.profile}</span>
      </div>
      <div class="hi-right">
        <div class="hi-time">${i.rem}h</div>
        <small style="color:var(--text-muted)">remaining</small>
      </div>
    </div>
  `).join('');
}

function clearHistory() {
  state.history = [];
  localStorage.removeItem('batteryHistory');
  renderHistory();
  showToast('🗑 History Cleared');
}

// ==================== TOAST ====================
function showToast(msg) {
  if (!els.toast) return;
  els.toast.innerHTML = msg;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 3000);
}

// ==================== PARTICLES ====================
function initParticles() {
  const c = document.getElementById('particleCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = window.innerWidth;
  c.height = window.innerHeight;

  const ps = [];
  for (let i = 0; i < 40; i++) {
    ps.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 0.5,
      dy: Math.random() * -1 - 0.3,
      a: Math.random() * 0.4 + 0.1
    });
  }

  (function render() {
    ctx.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,92,246,${p.a})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.y < -10) {
        p.y = c.height + 10;
        p.x = Math.random() * c.width;
      }
    });
    requestAnimationFrame(render);
  })();

  window.addEventListener('resize', () => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  });
}
