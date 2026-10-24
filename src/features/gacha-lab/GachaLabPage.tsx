import { Button } from '../../components/ui/Button'

/** The self-contained simulator is isolated from Zing Calendar business state. */
export function GachaLabPage({ onClose }: { onClose: () => void }) {
  return <div className="gacha-lab-overlay" role="dialog" aria-modal="true" aria-label="抽奖模拟器">
    <div className="gacha-lab-toolbar"><Button type="button" onClick={onClose}>‹ 返回</Button><strong>抽奖模拟器</strong><span>v1.22</span></div>
    <iframe className="gacha-lab-frame" title="Zing Gacha Lab" src="/gacha-lab/index.html" />
  </div>
}
