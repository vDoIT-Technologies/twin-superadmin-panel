function mulberry32(a) {
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDemoData() {
  const rng = mulberry32(20260613);
  const rand = (min, max) => min + (max - min) * rng();
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const jitter = (value, pct) => value * (1 + rand(-pct, pct));

  const DAYS = 90;
  const TODAY = new Date('2026-06-13T00:00:00Z');
  const dayDate = (index) => {
    const date = new Date(TODAY);
    date.setUTCDate(date.getUTCDate() - (DAYS - 1 - index));
    return date;
  };

  const SERVICES = [
    { id: 'twin', name: 'TWIN', desc: 'Consumer product - accounts, twins, chat, payments', stack: 'Node + MongoDB', vendors: ['openai', 'elevenlabs', 'did', 's3ses', 'blockchain', 'stripe'] },
    { id: 'persona', name: 'PERSONA', desc: 'AI / RAG brain - vector search + OpenAI', stack: 'Postgres + pgvector', vendors: ['openai', 'apify', 's3ses'] },
    { id: 'vault', name: 'VAULT', desc: 'Encrypted user file drive', stack: 'Postgres + IPFS', vendors: ['filebase', 's3ses', 'stripe'] },
    { id: 'sdk', name: 'SDK', desc: 'Integration-hub gateway every service calls', stack: 'Shares TWIN MongoDB', vendors: ['elevenlabs', 'did', 'heygen', 'filebase', 's3ses'] },
  ];

  const VENDORS = [
    { id: 'openai', name: 'OpenAI', cat: 'AI', unit: 'tokens', color: '#10a37f' },
    { id: 'elevenlabs', name: 'ElevenLabs', cat: 'Voice', unit: 'chars', color: '#6366f1' },
    { id: 'did', name: 'D-ID', cat: 'Video', unit: 'min', color: '#8b5cf6' },
    { id: 'heygen', name: 'HeyGen', cat: 'Video', unit: 'min', color: '#a855f7' },
    { id: 'apify', name: 'Apify', cat: 'Ingestion', unit: 'CU', color: '#f59e0b' },
    { id: 'filebase', name: 'Filebase / IPFS', cat: 'Storage', unit: 'GB', color: '#0ea5e9' },
    { id: 's3ses', name: 'AWS S3 + SES', cat: 'Infra', unit: 'GB', color: '#fb923c' },
    { id: 'blockchain', name: 'Polygon gas', cat: 'Chain', unit: 'tx', color: '#ec4899' },
    { id: 'stripe', name: 'Stripe / MoonPay', cat: 'Payments', unit: 'txn', color: '#635bff' },
  ];

  const RATE = {
    tokenUSD: 0.0000042,
    voiceChar: 0.00017,
    didMin: 0.28,
    heygenMin: 0.42,
    apifyCU: 0.025,
    filebaseGB: 0.0051,
    s3GB: 0.0009,
    gasTx: 0.018,
    stripePct: 0.029,
    whisperMin: 0.006,
    pointUSD: 0.012,
  };

  const ENVS = ['dev', 'staging', 'prod'];
  const ENV_META = {
    dev: { label: 'Dev', color: '#64748b', weight: 0.06 },
    staging: { label: 'Staging', color: '#0ea5e9', weight: 0.18 },
    prod: { label: 'Prod', color: '#4f46e5', weight: 1.0 },
  };

  const CLIENT_DEFS = [
    { id: 'acme', name: 'Acme AI', industry: 'Customer Support', plan: 'Enterprise', size: 1.0 },
    { id: 'nova', name: 'NovaCorp', industry: 'Sales Enablement', plan: 'Enterprise', size: 0.82 },
    { id: 'helix', name: 'Helix Health', industry: 'Healthcare', plan: 'Growth', size: 0.55 },
    { id: 'lumen', name: 'Lumen Labs', industry: 'EdTech', plan: 'Growth', size: 0.4 },
    { id: 'vertex', name: 'Vertex Finance', industry: 'Fintech', plan: 'Enterprise', size: 0.62 },
    { id: 'orbit', name: 'Orbit Media', industry: 'Media & Creators', plan: 'Startup', size: 0.28 },
  ];

  const CLIENTS = CLIENT_DEFS.map((client) => ({
    ...client,
    createdDaysAgo: randInt(120, 700),
    envWeights: {
      dev: client.size > 0.5 ? rand(0.4, 1) : rand(0.1, 0.5),
      staging: client.size > 0.35 ? rand(0.5, 1) : rand(0.2, 0.6),
      prod: 1,
    },
  }));

  const TWIN_NAMES = [
    ['Dr. Jane Doe', 'Medical Advisor'],
    ['Coach Mike', 'Fitness Coach'],
    ['Ada Quant', 'Financial Analyst'],
    ['Profesor Leon', 'Language Tutor'],
    ['Nova Concierge', 'Sales Assistant'],
    ['Helix Nurse', 'Triage Nurse'],
    ['Sage Counsel', 'Legal Aide'],
    ['Captain Orbit', 'Brand Persona'],
    ['Maya Mentor', 'Career Coach'],
    ['Vertex Advisor', 'Wealth Advisor'],
    ['Lumen Tutor', 'STEM Tutor'],
    ['Echo Support', 'Tier-1 Support'],
    ['Atlas Ops', 'DevOps Guru'],
    ['Iris Designer', 'UX Consultant'],
    ['Dr. Patel', 'Dermatology Bot'],
    ['Felix Funds', 'Crypto Guide'],
    ['Nova SDR', 'Outbound SDR'],
    ['Aria Wellness', 'Wellness Coach'],
    ['Orbit Host', 'Podcast Host'],
    ['Quinn Closer', 'Deals Closer'],
  ];

  const TWINS = TWIN_NAMES.map((twin, index) => {
    const client = CLIENTS[index % CLIENTS.length];
    const textMix = rand(0.4, 0.8);
    const audioMix = rand(0.1, 0.4);
    return {
      id: `tw${index + 1}`,
      name: twin[0],
      role: twin[1],
      clientId: client.id,
      createdDaysAgo: randInt(20, 400),
      weight: rand(0.4, 1.6),
      modalityMix: {
        text: textMix,
        audio: audioMix,
        video: Math.max(0.04, 1 - textMix - audioMix),
      },
    };
  });

  const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Ava', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Ethan', 'Amelia', 'Leo', 'Harper', 'Maya', 'Kai', 'Zoe', 'Ravi', 'Sara', 'Diego', 'Yuki', 'Nina', 'Omar', 'Chloe'];
  const lastNames = ['Carter', 'Reyes', 'Nguyen', 'Patel', 'Kim', 'Silva', 'Muller', 'Okafor', 'Rossi', 'Haddad', 'Wang', 'Brooks', 'Ivanov', 'Costa', 'Singh', 'Andersen', 'Mbeki', 'Tanaka', 'Lopez', 'Khan'];

  const USERS = Array.from({ length: 60 }, (_, index) => {
    const client = CLIENTS[randInt(0, CLIENTS.length - 1)];
    return {
      id: `u${index + 1}`,
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      clientId: client.id,
      env: rng() < 0.78 ? 'prod' : rng() < 0.6 ? 'staging' : 'dev',
      weight: rand(0.2, 2.2),
      pointsBalance: randInt(0, 9000),
      lastActiveDaysAgo: Math.floor(Math.pow(rng(), 2.4) * 45),
      twinsUsed: randInt(1, 5),
    };
  });

  const SERVICE_VENDOR_SHARE = {
    twin: { openai: 0.34, elevenlabs: 0.18, did: 0.2, s3ses: 0.08, blockchain: 0.07, stripe: 0.13 },
    persona: { openai: 0.74, apify: 0.2, s3ses: 0.06 },
    vault: { filebase: 0.52, s3ses: 0.3, stripe: 0.18 },
    sdk: { elevenlabs: 0.16, did: 0.22, heygen: 0.3, filebase: 0.18, s3ses: 0.14 },
  };

  const SERVICE_BASE_COST = { twin: 980, persona: 1420, vault: 240, sdk: 760 };
  const ANOMALY = { clientId: 'nova', service: 'persona', env: 'prod', startDay: DAYS - 9, mult: 2.9 };
  const facts = [];

  for (let day = 0; day < DAYS; day += 1) {
    const date = dayDate(day);
    const dayOfWeek = date.getUTCDay();
    const weekend = dayOfWeek === 0 || dayOfWeek === 6 ? 0.72 : 1;
    const trend = 0.7 + 0.5 * (day / DAYS) + 0.04 * Math.sin(day / 6);

    CLIENTS.forEach((client) => {
      ENVS.forEach((env) => {
        const envWeight = ENV_META[env].weight * client.envWeights[env];
        if (envWeight < 0.04) {
          return;
        }

        SERVICES.forEach((service) => {
          const scale = client.size * envWeight * trend * weekend * jitter(1, 0.18);
          let cost = SERVICE_BASE_COST[service.id] * scale;
          let anomalous = false;

          if (client.id === ANOMALY.clientId && service.id === ANOMALY.service && env === ANOMALY.env && day >= ANOMALY.startDay) {
            cost *= ANOMALY.mult;
            anomalous = true;
          }

          const vendorCost = {};
          Object.entries(SERVICE_VENDOR_SHARE[service.id]).forEach(([vendorId, share]) => {
            vendorCost[vendorId] = +(cost * share).toFixed(2);
          });

          const tokens = service.vendors.includes('openai') ? Math.round((vendorCost.openai || 0) / RATE.tokenUSD) : 0;
          const voiceChars = service.vendors.includes('elevenlabs') ? Math.round((vendorCost.elevenlabs || 0) / RATE.voiceChar) : 0;
          const didMin = service.vendors.includes('did') ? Math.round((vendorCost.did || 0) / RATE.didMin) : 0;
          const heyMin = service.vendors.includes('heygen') ? Math.round((vendorCost.heygen || 0) / RATE.heygenMin) : 0;
          const videoMins = didMin + heyMin;
          const apifyCU = service.vendors.includes('apify') ? Math.round((vendorCost.apify || 0) / RATE.apifyCU) : 0;
          const ingestJobs = service.id === 'persona' ? Math.round(apifyCU / randInt(8, 16)) : 0;
          const storageGB = (vendorCost.filebase || 0) / RATE.filebaseGB + (vendorCost.s3ses || 0) / RATE.s3GB;
          const gasTx = service.vendors.includes('blockchain') ? Math.round((vendorCost.blockchain || 0) / RATE.gasTx) : 0;

          let messages = 0;
          if (service.id === 'twin' || service.id === 'persona') {
            messages = Math.round(tokens / randInt(420, 620) || cost * 0.9);
          } else if (service.id === 'sdk') {
            messages = Math.round(cost * 0.4);
          }

          const mText = Math.round(messages * 0.62);
          const mAudio = Math.round(messages * 0.24);
          const mVideo = messages - mText - mAudio;
          const whisperMins = Math.round(mAudio / randInt(6, 10));
          const apiCalls = Math.round(messages * randInt(3, 7) + cost * 2 + (service.id === 'sdk' ? cost * 6 : 0));
          const marginPct = 0.52 + 0.18 * rng() - (anomalous ? 0.35 : 0);
          const revenue = cost / (1 - Math.min(0.78, Math.max(0.05, marginPct)));
          const pointsPurchased = Math.round(revenue / RATE.pointUSD);
          const pointsSpent = Math.round(pointsPurchased * rand(0.78, 0.98));

          facts.push({
            day,
            date: date.toISOString().slice(0, 10),
            env,
            clientId: client.id,
            service: service.id,
            cost: +cost.toFixed(2),
            revenue: +revenue.toFixed(2),
            vendorCost,
            messages,
            mText,
            mAudio,
            mVideo,
            tokens,
            voiceChars,
            videoMins,
            didMin,
            heyMin,
            whisperMins,
            apifyCU,
            ingestJobs,
            storageGB: +storageGB.toFixed(2),
            apiCalls,
            gasTx,
            pointsPurchased,
            pointsSpent,
            sessions: Math.round(messages / randInt(4, 9)) + 1,
            anomalous,
          });
        });
      });
    });
  }

  const EVENT_TYPES = [
    { ev: 'chat.message', svc: 'twin', unit: 'msg' },
    { ev: 'chat.completion', svc: 'persona', unit: 'tokens' },
    { ev: 'embed.upsert', svc: 'persona', unit: 'tokens' },
    { ev: 'video.generate', svc: 'sdk', unit: 'min' },
    { ev: 'voice.synthesize', svc: 'twin', unit: 'chars' },
    { ev: 'ingest.scrape', svc: 'persona', unit: 'CU' },
    { ev: 'file.pin', svc: 'vault', unit: 'GB' },
    { ev: 'route.hit', svc: 'sdk', unit: 'call' },
    { ev: 'payment.charge', svc: 'twin', unit: 'txn' },
    { ev: 'transcribe.audio', svc: 'persona', unit: 'min' },
  ];
  const LEVELS = ['info', 'info', 'info', 'info', 'warn', 'info', 'info', 'error'];

  const EVENTS = Array.from({ length: 280 }, () => {
    const eventType = pick(EVENT_TYPES);
    const client = pick(CLIENTS);
    const twin = pick(TWINS.filter((entry) => entry.clientId === client.id)) || pick(TWINS);
    const user = pick(USERS.filter((entry) => entry.clientId === client.id)) || pick(USERS);
    const minsAgo = Math.floor(Math.pow(rng(), 1.7) * 60 * 36);
    const timestamp = new Date(TODAY.getTime() - minsAgo * 60000);
    const units = randInt(1, eventType.unit === 'tokens' ? 4200 : eventType.unit === 'chars' ? 1800 : 60);
    const env = rng() < 0.7 ? 'prod' : rng() < 0.6 ? 'staging' : 'dev';
    return {
      ts: timestamp.toISOString(),
      tsLabel: timestamp.toISOString().slice(0, 16).replace('T', '  '),
      env,
      service: eventType.svc,
      clientId: client.id,
      twinId: twin.id,
      userId: user.id,
      event: eventType.ev,
      units,
      unitLabel: eventType.unit,
      cost: +(units * (eventType.unit === 'tokens' ? RATE.tokenUSD : eventType.unit === 'min' ? RATE.didMin : eventType.unit === 'chars' ? RATE.voiceChar : 0.01)).toFixed(4),
      level: pick(LEVELS),
    };
  }).sort((a, b) => b.ts.localeCompare(a.ts));

  const ALERTS = [
    { sev: 'red', text: 'Prod · PERSONA · NovaCorp - OpenAI cost +190% vs prior week', meta: 'Anomaly detected 9d ago · sustained spike' },
    { sev: 'amber', text: 'Prod · SDK - HeyGen video minutes trending +34% WoW', meta: 'Approaching monthly budget (82%)' },
    { sev: 'amber', text: 'VAULT - Filebase storage at 78% of provisioned quota', meta: 'Projected to hit 100% in ~18 days' },
    { sev: 'emerald', text: 'Overall blended margin holding at 61% across prod', meta: 'Within target band (55-65%)' },
  ];

  const BUDGETS = { twin: 38000, persona: 64000, vault: 9000, sdk: 31000 };

  const data = {
    DAYS,
    TODAY,
    dayDate,
    SERVICES,
    VENDORS,
    RATE,
    ENVS,
    ENV_META,
    CLIENTS,
    TWINS,
    USERS,
    SERVICE_VENDOR_SHARE,
    BUDGETS,
    facts,
    EVENTS,
    ALERTS,
    ANOMALY,
  };

  data.byId = {
    client: (id) => data.CLIENTS.find((client) => client.id === id),
    twin: (id) => data.TWINS.find((twin) => twin.id === id),
    user: (id) => data.USERS.find((user) => user.id === id),
    service: (id) => data.SERVICES.find((service) => service.id === id),
    vendor: (id) => data.VENDORS.find((vendor) => vendor.id === id),
  };

  return data;
}

export const superadminDemoData = createDemoData();
