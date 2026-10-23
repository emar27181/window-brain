import { useState } from 'react';
import type { WidgetItem } from '../types';
import { WIDGET_REGISTRY } from './widgets';
import { proposeLayoutFromInstruction } from '../lib/layoutAssistant';

interface Props {
  onClose: () => void;
  onApply: (layout: WidgetItem[]) => void;
}

const EXAMPLE = 'ニュースを1枠、音楽を1枠、ゲーム配信を2画面で並べる';

export function LayoutAssistantModal({ onClose, onApply }: Props) {
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState<ReturnType<typeof proposeLayoutFromInstruction> | null>(null);
  const generate = () => setProposal(proposeLayoutFromInstruction(instruction));

  return (
    <div className="picker-bd" onClick={onClose}>
      <section className="settings" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="settings-hd">
          <div>
            <div className="settings-title">指示からレイアウトを作成</div>
            <div className="settings-sub">LAYOUT COMPOSER</div>
          </div>
          <button className="x" onClick={onClose}>CLOSE ✕</button>
        </div>
        <div className="settings-body">
          <p className="muted" style={{ margin: '0 0 10px', lineHeight: 1.6, fontSize: 12 }}>
            ニュース、音楽、配信などの希望を入力すると、配置候補を作ります。現在はキーワードから配置を組み立てます。適用すると現在の配置を置き換えます。
          </p>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder={EXAMPLE}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'var(--track)', border: '1px solid var(--rule-strong)', borderRadius: 10, padding: 12, color: 'inherit', font: 'inherit', fontSize: 13 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
            <span className="mono muted" style={{ fontSize: 9 }}>キーワードをローカル判定 · 外部AI接続なし</span>
            <button className="s-btn" onClick={generate} disabled={!instruction.trim()}>配置候補を作る</button>
          </div>
          {proposal && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
              {proposal.unsupported ? (
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                  対応するウィジェットが見つかりません。ニュース、音楽、配信、タスク、予定、天気、時計などを含めてください。
                </div>
              ) : (
                <>
                  <div className="mono muted" style={{ fontSize: 9, letterSpacing: '.14em', marginBottom: 8 }}>PROPOSED · {proposal.layout.length} WIDGETS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {proposal.summary.map((item) => <span key={item} className="s-pill active">{item}</span>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 6, marginTop: 12 }}>
                    {proposal.layout.map((item) => {
                      const label = WIDGET_REGISTRY.find((widget) => widget.type === item.type)?.label ?? item.type;
                      return <div key={item.id} style={{ padding: '8px 9px', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11 }}>{label}<span className="mono muted" style={{ float: 'right', fontSize: 9 }}>{item.w}×{item.h}</span></div>;
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                    <button className="s-btn" onClick={onClose}>キャンセル</button>
                    <button className="s-btn" onClick={() => onApply(proposal.layout)}>この配置を適用</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
