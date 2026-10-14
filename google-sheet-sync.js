const STPM_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXnprWNvCp7LEl2-DmyVM4i3uzaKaqkce7YXHMM4S7-oQW6nqK1KyUH0RUpsRPcvnx/exec';

class STPMSheetBridge {
  constructor(url) {
    this.url = url;
    this.channel = this.id();
    this.requests = new Map();
    this.onMessage = this.onMessage.bind(this);
    window.addEventListener('message', this.onMessage);
  }

  id() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const random = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
    return `stpm_${Date.now()}_${random}`;
  }

  reset() {
    this.frame?.remove();
    this.frame = null;
    this.readyPromise = null;
    this.readyResolve = null;
    this.remote = null;
    this.remoteOrigin = null;
    this.channel = this.id();
  }

  onMessage(event) {
    const data = event.data;
    if (!data || data.channel !== this.channel || !/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(event.origin)) return;
    if (data.type === 'stpm-ready' && this.readyResolve) {
      this.remote = event.source;
      this.remoteOrigin = event.origin;
      this.readyResolve();
      this.readyResolve = null;
      return;
    }
    if (data.type !== 'stpm-response' || event.source !== this.remote) return;
    const request = this.requests.get(data.id);
    if (!request) return;
    this.requests.delete(data.id);
    clearTimeout(request.timer);
    if (data.payload?.ok) request.resolve(data.payload);
    else {
      const message = data.payload?.code === 'AUTH'
        ? 'Apps Script masih menggunakan versi kod akses. Deploy Code.gs baharu sebagai New version.'
        : data.payload?.error || 'Google Sheet tidak dapat dihubungi.';
      const error = new Error(message);
      error.code = data.payload?.code;
      request.reject(error);
    }
  }

  ready() {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.frame?.remove();
        this.readyPromise = null;
        this.readyResolve = null;
        reject(new Error('Apps Script belum tersedia. Semak deployment Web App.'));
      }, 30000);
      this.readyResolve = () => { clearTimeout(timer); resolve(); };
      const url = new URL(this.url);
      url.searchParams.set('action', 'bridge');
      url.searchParams.set('channel', this.channel);
      url.searchParams.set('origin', location.origin);
      this.frame = document.createElement('iframe');
      this.frame.hidden = true;
      this.frame.title = 'Sambungan Google Sheet';
      this.frame.src = url.toString();
      document.body.appendChild(this.frame);
    });
    return this.readyPromise;
  }

  async request(payload) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const id = this.id();
      const timer = setTimeout(() => {
        this.requests.delete(id);
        reject(new Error('Tiada pengesahan simpan daripada Google Sheet.'));
      }, 45000);
      this.requests.set(id, { resolve, reject, timer });
      this.remote.postMessage({ type: 'stpm-request', channel: this.channel, id, request: payload }, this.remoteOrigin);
    });
  }
}

class STPMSheetSync {
  constructor(options) {
    this.options = options;
    this.bridge = options.bridge || new STPMSheetBridge(STPM_APPS_SCRIPT_URL);
    const stored = options.readQueue();
    this.pending = Array.isArray(stored?.pending) ? stored.pending : [];
    this.batch = stored?.batch || null;
    this.connected = false;
    this.busy = false;
    this.migrated = false;
  }

  persist() {
    this.options.writeQueue({ pending: this.pending, batch: this.batch });
  }

  status(message) {
    this.options.onStatus(message);
  }

  async connect() {
    if (this.busy) return;
    this.connected = false;
    this.busy = true;
    this.status('Menyambung Google Sheet...');
    try {
      this.bridge.reset?.();
      const snapshot = await this.bridge.request({ action: 'load' });
      this.validateSnapshot(snapshot);
      // Migrate only cells absent from the Sheet; existing shared cells win.
      if (!this.migrated) {
        this.options.collectLocal().forEach((change) => {
          const exists = change.kind === 'grade'
            ? snapshot.records?.[change.studentId]?.[change.assessmentId]?.[change.subjectId] !== undefined
            : snapshot.targets?.[change.studentId]?.[change.subjectId]?.[change.assessmentId] !== undefined
              || snapshot.records?.[change.studentId]?.[change.assessmentId]?.[change.subjectId] !== undefined;
          const queued = this.pending.some((item) => this.key(item.change) === this.key(change));
          if (!exists && !queued) this.pending.push({ id: this.bridge.id(), change });
        });
        this.migrated = true;
        this.persist();
      }
      this.connected = true;
      this.options.applySnapshot(snapshot, this.pending.map((item) => item.change));
      this.status('Data terkini dimuatkan daripada Google Sheet.');
    } catch (error) {
      this.status(`${error.message} Data tempatan dikekalkan.`);
      throw error;
    } finally {
      this.busy = false;
    }
    await this.flush();
  }

  key(change) {
    return JSON.stringify([change.kind, change.studentId, change.assessmentId, change.subjectId]);
  }

  validateSnapshot(snapshot) {
    if (snapshot?.version !== 3) {
      throw new Error('Deploy Code.gs versi 3 sebagai New version dalam Apps Script.');
    }
    if (!snapshot.records || !snapshot.targets) {
      throw new Error('Data Google Sheet tidak lengkap.');
    }
  }

  enqueue(changes) {
    if (!changes.length) return;
    changes.forEach((change) => this.pending.push({ id: this.bridge.id(), change }));
    this.persist();
    this.status(this.connected ? 'Menunggu simpanan Google Sheet...' : 'Belum disimpan ke Google Sheet. Sambungan sedang menunggu; perubahan akan dihantar apabila sambungan pulih.');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 800);
  }

  async flush() {
    if (!this.connected || this.busy || !this.pending.length) return;
    this.busy = true;
    try {
      while (this.pending.length) {
        if (!this.batch) {
          this.batch = { operationId: this.bridge.id(), items: this.pending.slice(0, 200) };
          this.persist();
        }
        this.status('Menyimpan ke Google Sheet...');
        const batch = this.batch;
        const snapshot = await this.bridge.request({ action: 'save',
          operationId: batch.operationId, changes: batch.items.map((item) => item.change) });
        this.validateSnapshot(snapshot);
        if (snapshot.operationId !== batch.operationId) throw new Error('Pengesahan simpan tidak sepadan.');
        const completed = new Set(batch.items.map((item) => item.id));
        this.pending = this.pending.filter((item) => !completed.has(item.id));
        this.batch = null;
        this.persist();
        this.options.applySnapshot(snapshot, this.pending.map((item) => item.change));
      }
      this.status('Disimpan dalam Google Sheet.');
    } catch (error) {
      this.connected = false;
      this.status(`${error.message} Perubahan belum dihantar dikekalkan dalam peranti.`);
    } finally {
      this.busy = false;
    }
  }

  async refresh() {
    if (!this.connected || this.busy) return;
    if (this.pending.length) return this.flush();
    this.busy = true;
    try {
      const snapshot = await this.bridge.request({ action: 'load' });
      this.validateSnapshot(snapshot);
      this.options.applySnapshot(snapshot, this.pending.map((item) => item.change));
      this.status('Data terkini dimuatkan daripada Google Sheet.');
    } catch (error) {
      this.connected = false;
      this.status(`${error.message} Data tempatan dikekalkan.`);
    } finally {
      this.busy = false;
    }
    await this.flush();
  }
}
