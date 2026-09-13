'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { DISCIPLINES, TIERS, SECTIONS, getSection } from '@/lib/rubric';

const SAMPLE_TEXT =
  '青藏高原多年冻土区的地表形变对气候变暖高度敏感，然而已有研究多聚焦于单点监测或短时间序列观测，缺乏区域尺度、长时序的形变过程刻画。本文利用InSAR技术反演了2015—2022年若尔盖地区的地表形变速率，发现形变呈现出明显的季节性波动特征。已有研究（Wang et al., 2019）也提到过类似现象，但未对其驱动机制做进一步讨论。本文认为，气温与降水的共同作用可能是造成这一现象的原因，后续将结合更多站点数据进行验证。';

const STATIC_EXAMPLE = {
  tier_verdict:
    '这段引言目前更接近普通专业期刊水平：研究缺口交代清楚，但因果表述偏推测、证据链未闭合，距离子刊/顶刊要求的"证据—机制—意义"递进结构还有明显差距。',
  scores: {
    logic: { score: 58, comment: '缺口—方法—发现—机制推测的顺序合理，但"可能是"式的软表述削弱了论证力度。' },
    evidence: { score: 46, comment: '仅引用一篇同类研究作为对照，未与更广的区域研究或已知机制文献形成证据网络。' },
    language: { score: 63, comment: '句式规范但偏平铺直叙，关键发现未使用顶刊常见的强调句式与精确量化表达。' },
  } as Record<string, { score: number; comment: string }>,
  comments: [
    {
      quote: '已有研究多聚焦于单点监测',
      issue: '研究缺口陈述过于笼统',
      top_journal_practice:
        '顶刊通常会点名1-2项代表性研究并具体指出其时空局限（如覆盖范围、时间分辨率），让缺口可被验证。',
    },
    {
      quote: '发现形变呈现出明显的季节性波动特征',
      issue: '核心发现缺少量化支撑',
      top_journal_practice: '子刊/顶刊会在同一句给出量级与不确定性范围，例如具体的形变速率区间和置信水平。',
    },
    {
      quote: '本文认为，气温与降水的共同作用可能是造成这一现象的原因',
      issue: '机制解释使用推测语气，未与证据挂钩',
      top_journal_practice:
        '顶刊倾向于用"与...一致""支持了...假设"等表述，把推测锚定在已呈现的数据或文献证据上。',
    },
  ],
  rewrite:
    '青藏高原多年冻土区地表形变对气候变暖响应敏感，但既有研究（如 Wang et al., 2019；覆盖单一观测站、时间跨度不足3年）难以刻画区域尺度的长期演化过程。本文基于InSAR技术反演2015—2022年若尔盖地区地表形变速率，识别出振幅约2–5 mm/yr的季节性波动，其峰值时相与区域气温回升期高度吻合，与冻融循环驱动地表形变的机制假设一致。这一发现为量化多年冻土退化的区域异质性提供了长时序观测证据。',
};

type Diagnosis = {
  tier_verdict: string;
  scores: Record<string, { score: number; comment: string }>;
  comments: { quote: string; issue: string; top_journal_practice: string }[];
  rewrite: string;
};

function scoreColorVars(v: number) {
  if (v >= 75) return { fill: 'var(--good)' };
  if (v >= 55) return { fill: 'var(--mid)' };
  return { fill: 'var(--low)' };
}

function detectCitations(text: string): string[] {
  const patterns = [/[（(][^（）()]{0,40}?\d{4}[a-z]?[^（）()]{0,10}?[）)]/g, /\[\s*\d+(?:\s*[-,]\s*\d+)*\s*\]/g];
  const found = new Set<string>();
  patterns.forEach((re) => {
    const m = text.match(re);
    if (m) m.forEach((x) => found.add(x.trim()));
  });
  return Array.from(found);
}

type HistoryItem = {
  id: number;
  created_at: string;
  discipline: string;
  tier: string;
  section: string;
  tier_verdict: string | null;
  score_logic: number | null;
};

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [discipline, setDiscipline] = useState('地理科学');
  const [tier, setTier] = useState('领域子刊');
  const [sectionKey, setSectionKey] = useState('introduction');
  const [manuscript, setManuscript] = useState(SAMPLE_TEXT);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>(STATIC_EXAMPLE as Diagnosis);
  const [diagTag, setDiagTag] = useState('示例结果（预生成）');
  const [status, setStatus] = useState('');
  const [banner, setBanner] = useState<{ text: string; kind: 'warn' | 'error' } | null>(null);
  const [running, setRunning] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [stats, setStats] = useState<{ available: boolean; count: number } | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const section = getSection(sectionKey);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
    fetch('/api/auth-config')
      .then((r) => r.json())
      .then((d) => setAuthEnabled(Boolean(d?.enabled)))
      .catch(() => setAuthEnabled(false));
  }, []);

  useEffect(() => {
    if (authEnabled && session?.user) {
      fetch('/api/history')
        .then((r) => r.json())
        .then((d) => setHistory(d?.items ?? []))
        .catch(() => setHistory(null));
    }
  }, [authEnabled, session]);

  const citations = detectCitations(manuscript);
  const needsLogin = authEnabled && sessionStatus !== 'loading' && !session?.user;

  async function runDiagnosis() {
    if (running) return;
    if (needsLogin) {
      signIn('google');
      return;
    }
    const text = manuscript.trim();
    if (text.length < 20) {
      setBanner({ text: '请先粘贴或载入一段至少20字的稿件文本。', kind: 'warn' });
      return;
    }
    setBanner(null);
    setRunning(true);
    setDiagTag('AI 诊断中');
    setStatus('思考中…（通常需要 10–40 秒）');

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline, tier, section: sectionKey, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        const copy: Record<string, string> = {
          rate_limited: '当前请求较多，请稍后再试。',
          invalid_json: 'AI 返回内容解析失败，请重试一次。',
          server_not_configured: '服务端尚未配置模型密钥，请联系管理员。',
          not_authenticated: '请先使用 Google 登录后再试。',
        };
        setBanner({ text: copy[data?.error] || `诊断请求失败（${data?.error || '未知错误'}），请重试。`, kind: 'error' });
        setDiagTag('示例结果（预生成）');
        setDiagnosis(STATIC_EXAMPLE as Diagnosis);
        setShowCompare(false);
        return;
      }
      setDiagnosis(data);
      setDiagTag('AI 实时诊断');
      setShowCompare(true);
      fetch('/api/stats')
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
      if (authEnabled && session?.user) {
        fetch('/api/history')
          .then((r) => r.json())
          .then((d) => setHistory(d?.items ?? []))
          .catch(() => {});
      }
    } catch {
      setBanner({ text: '网络请求失败，请检查网络后重试。', kind: 'error' });
    } finally {
      setStatus('');
      setRunning(false);
    }
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="masthead-left">
          <div className="wordmark">
            <h1>稿镜</h1>
            <span className="en">Manuscript Mirror · AI 科研写作诊断</span>
          </div>
          <div className="tagline">
            让学生对照子刊 / 顶刊的写作范式，看清自己的稿件与目标之间还差在哪——诊断在前，示范在侧，原文永远由学生自己完成。
          </div>
        </div>
        <div className="masthead-right">
          <span className="badge">v0.2 · 地理科学试点</span>
          {authEnabled && (
            <div className="auth-box">
              {session?.user ? (
                <>
                  <span className="auth-email">{session.user.email}</span>
                  <button type="button" onClick={() => signOut()}>
                    退出登录
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => signIn('google')}>
                  使用 Google 登录
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="controls">
        <div className="field">
          <label>学科方向</label>
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value} disabled={!d.enabled}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>对标层级</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>文段类型</label>
          <select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="spacer" />
        <button type="button" onClick={() => setManuscript(SAMPLE_TEXT)}>
          载入示例文本
        </button>
        <button type="button" className="primary" onClick={runDiagnosis} disabled={running}>
          {running ? 'AI 正在比对顶刊范式…' : needsLogin ? '登录后开始诊断' : '开始诊断（调用 AI）'}
        </button>
      </div>

      {banner && <div className={`banner ${banner.kind}`}>{banner.text}</div>}

      {authEnabled && session?.user && history && history.length > 0 && (
        <div className="history-box">
          <button type="button" className="history-toggle" onClick={() => setShowHistory((v) => !v)}>
            我的历史记录（{history.length}） {showHistory ? '收起 ▲' : '展开 ▼'}
          </button>
          {showHistory && (
            <div className="history-list">
              {history.map((h) => (
                <div className="history-item" key={h.id}>
                  <span className="history-meta">
                    {new Date(h.created_at).toLocaleString('zh-CN')} · {h.discipline} · {h.tier} · {h.section}
                  </span>
                  <span className="history-verdict">{h.tier_verdict}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="workspace">
        <section className="panel">
          <div className="panel-head">
            <h3>稿件文本</h3>
            <span className="hint">粘贴或编辑后点击「开始诊断」</span>
          </div>
          <div className="panel-body">
            <textarea
              value={manuscript}
              onChange={(e) => setManuscript(e.target.value)}
              placeholder="在此粘贴你的论文段落（建议 100–400 字）……"
            />
          </div>
          {showCompare && (
            <div className="compare">
              <div className="compare-col orig">
                <span className="compare-label">学生原文</span>
                <div>{manuscript.trim()}</div>
              </div>
              <div className="compare-col rewrite">
                <span className="compare-label">对照示范 · 同层级改写</span>
                <div style={{ whiteSpace: 'pre-line' }}>{diagnosis.rewrite}</div>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>诊断结果</h3>
            <span className="hint">{diagTag}</span>
          </div>
          <div className="diag-status">{status}</div>
          <div className="panel-body">
            <div className="verdict">{diagnosis.tier_verdict}</div>
            {section.dimensions.map((dim) => {
              const s = diagnosis.scores[dim.key];
              if (!s) return null;
              const c = scoreColorVars(s.score);
              return (
                <div className="score-row" key={dim.key}>
                  <div className="score-top">
                    <span className="score-name">{dim.label}</span>
                    <span className="score-num" style={{ color: c.fill }}>
                      {s.score}
                    </span>
                  </div>
                  <div className="score-track">
                    <div
                      className="score-fill"
                      style={{ width: `${Math.max(0, Math.min(100, s.score))}%`, background: c.fill }}
                    />
                  </div>
                  <div className="score-comment">{s.comment}</div>
                </div>
              );
            })}
            {diagnosis.comments.map((c, i) => (
              <div className="comment-card" key={i}>
                <div className="comment-quote">“{c.quote}”</div>
                <div className="comment-issue">{c.issue}</div>
                <div className="comment-practice">
                  <b>对标层级通常这样处理：</b>
                  {c.top_journal_practice}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 22 }}>
        <div className="panel-head">
          <h3>文献引用识别（原型预览）</h3>
          <span className="hint">规则识别，非真实核验</span>
        </div>
        <div className="panel-body">
          <div className="cite-list">
            {citations.length === 0 ? (
              <span className="cite-empty">粘贴含引用标记的文本后自动识别，例如 (Chen et al., 2023) 或 [12]</span>
            ) : (
              citations.map((c, i) => (
                <span className="cite-chip" key={i}>
                  <span className="dot" />
                  {c} · 待核验
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="roadmap">
        <h3>后续开发路线（本原型验证的方向）</h3>
        <div className="roadmap-grid">
          <div className="roadmap-item">
            <b>顶刊语料库训练</b>基于导师团队一作/通讯发表与审稿积累，深度训练结构—逻辑—语言特征。
          </div>
          <div className="roadmap-item">
            <b>文献真实性核验引擎</b>接入检索与比对能力，替代当前的规则识别演示。
          </div>
          <div className="roadmap-item">
            <b>跨学科迁移</b>以地理科学验证后，逐步扩展至生态、遥感等相邻学科。
          </div>
          <div className="roadmap-item">
            <b>产品化部署</b>网页版 + VS Code / Word 插件，兼顾低成本本地部署。
          </div>
        </div>
        {stats && (
          <div className="stats-line">
            {stats.available
              ? `数据库已连接 · 累计收录 ${stats.count} 次诊断记录`
              : '数据库尚未配置（在 Vercel 项目中添加 Postgres 存储后自动启用）'}
          </div>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 20px 60px;
        }
        .masthead {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          flex-wrap: wrap;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--ink);
          margin-bottom: 28px;
        }
        .masthead-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .masthead-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .wordmark {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .wordmark h1 {
          font-size: 34px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .wordmark .en {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--ink-faint);
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .tagline {
          font-size: 14px;
          color: var(--ink-soft);
          max-width: 56ch;
          line-height: 1.6;
        }
        .badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.8px;
          color: var(--pen);
          border: 1px solid var(--pen);
          background: var(--pen-tint);
          padding: 4px 9px;
          border-radius: 3px;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .auth-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .auth-email {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--ink-faint);
        }
        .controls {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: flex-end;
          background: var(--paper-raised);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 16px 18px;
          margin-bottom: 22px;
          box-shadow: var(--shadow);
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .field label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: var(--ink-faint);
          font-weight: 500;
        }
        select {
          font-family: inherit;
          font-size: 13.5px;
          color: var(--ink);
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 5px;
          padding: 7px 10px;
          min-width: 170px;
        }
        .spacer {
          flex: 1;
        }
        button {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          border-radius: 5px;
          border: 1px solid var(--line);
          cursor: pointer;
          padding: 9px 16px;
          background: var(--paper);
          color: var(--ink);
        }
        button.primary {
          background: var(--accent);
          color: var(--paper-raised);
          border-color: var(--accent);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .banner {
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 6px;
          margin-bottom: 18px;
          border: 1px solid var(--line);
          color: var(--ink-soft);
        }
        .banner.warn {
          background: var(--mid-tint);
          border-color: var(--mid);
          color: var(--ink);
        }
        .banner.error {
          background: var(--low-tint);
          border-color: var(--low);
          color: var(--ink);
        }
        .history-box {
          margin-bottom: 18px;
        }
        .history-toggle {
          font-size: 12.5px;
          color: var(--ink-soft);
          background: transparent;
          border: 1px dashed var(--line);
          width: 100%;
          text-align: left;
        }
        .history-list {
          border: 1px solid var(--line);
          border-top: none;
          border-radius: 0 0 6px 6px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .history-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }
        .history-meta {
          font-family: 'IBM Plex Mono', monospace;
          color: var(--ink-faint);
        }
        .history-verdict {
          color: var(--ink-soft);
        }
        .workspace {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 820px) {
          .workspace {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: var(--paper-raised);
          border: 1px solid var(--line);
          border-radius: 8px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 18px;
          border-bottom: 1px solid var(--line);
        }
        .panel-head h3 {
          font-size: 15px;
          font-weight: 600;
        }
        .panel-head .hint {
          font-size: 11px;
          color: var(--ink-faint);
          font-family: 'IBM Plex Mono', monospace;
        }
        .panel-body {
          padding: 18px;
        }
        textarea {
          width: 100%;
          min-height: 260px;
          resize: vertical;
          border: none;
          outline: none;
          background: transparent;
          color: var(--ink);
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 16.5px;
          line-height: 1.85;
          padding: 0;
        }
        .diag-status {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--ink-faint);
          padding: 2px 18px 0;
          min-height: 18px;
        }
        .score-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 16px;
        }
        .score-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .score-name {
          font-size: 13px;
          font-weight: 600;
        }
        .score-num {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
        }
        .score-track {
          height: 7px;
          border-radius: 4px;
          background: var(--line);
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          border-radius: 4px;
        }
        .score-comment {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.55;
        }
        .verdict {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--ink);
          background: var(--accent-tint);
          border-left: 3px solid var(--accent);
          padding: 10px 13px;
          border-radius: 0 5px 5px 0;
          margin-bottom: 18px;
        }
        .comment-card {
          border-left: 3px solid var(--pen);
          background: var(--pen-tint);
          border-radius: 0 6px 6px 0;
          padding: 10px 13px;
          margin-bottom: 10px;
        }
        .comment-quote {
          font-family: 'Source Serif 4', Georgia, serif;
          font-style: italic;
          font-size: 13.5px;
          color: var(--ink);
          margin-bottom: 5px;
        }
        .comment-issue {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--pen);
          margin-bottom: 3px;
        }
        .comment-practice {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.55;
        }
        .comment-practice b {
          color: var(--ink);
          font-weight: 600;
        }
        .compare {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid var(--line);
        }
        @media (max-width: 820px) {
          .compare {
            grid-template-columns: 1fr;
          }
        }
        .compare-col {
          padding: 18px;
          font-size: 14.5px;
          line-height: 1.8;
          font-family: 'Source Serif 4', Georgia, serif;
        }
        .compare-col.orig {
          border-right: 1px solid var(--line);
          color: var(--ink-soft);
        }
        .compare-col.rewrite {
          color: var(--ink);
          background: var(--good-tint);
        }
        .compare-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: var(--ink-faint);
          margin-bottom: 10px;
          display: block;
        }
        .cite-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .cite-chip {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          padding: 5px 10px;
          border-radius: 14px;
          background: var(--paper);
          border: 1px solid var(--line);
          color: var(--ink-soft);
        }
        .cite-chip .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mid);
          margin-right: 6px;
        }
        .cite-empty {
          font-size: 13px;
          color: var(--ink-faint);
        }
        .roadmap {
          margin-top: 34px;
          border-top: 1px solid var(--line);
          padding-top: 18px;
        }
        .roadmap h3 {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--ink-faint);
          font-family: 'IBM Plex Sans', sans-serif;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .roadmap-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 820px) {
          .roadmap-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 480px) {
          .roadmap-grid {
            grid-template-columns: 1fr;
          }
        }
        .roadmap-item {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.55;
          padding: 12px;
          border: 1px dashed var(--line);
          border-radius: 6px;
        }
        .roadmap-item b {
          display: block;
          color: var(--ink);
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .stats-line {
          margin-top: 14px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11.5px;
          color: var(--ink-faint);
        }
      `}</style>
    </div>
  );
}
