import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button'

/** The simulator remains isolated; navigation belongs to the host application. */
export function GachaLabPage({ onClose }: { onClose: () => void }) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'slow' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    setLoadState('loading')
    const timer = window.setTimeout(() => setLoadState(state => state === 'loading' ? 'slow' : state), 8000)
    return () => window.clearTimeout(timer)
  }, [retryKey])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  return createPortal(
    <div className="gacha-lab-overlay" role="dialog" aria-modal="true" aria-label="抽奖模拟器">
      <div className="gacha-lab-toolbar">
        <Button type="button" onClick={onClose} aria-label="返回日历">‹ 返回</Button>
        <strong>抽奖模拟器</strong><span>v1.22</span>
      </div>
      <div className="gacha-lab-content">
        <iframe key={retryKey} className="gacha-lab-frame" title="Zing Gacha Lab" src="/gacha-lab/index.html"
          onLoad={() => setLoadState('ready')} onError={() => setLoadState('error')} />
        {(loadState === 'slow' || loadState === 'error') && <div className="gacha-lab-recovery" role="status">
          <p>{loadState === 'slow' ? '抽奖模拟器加载较慢，仍可直接返回日历。' : '抽奖模拟器加载失败，日历数据不受影响。'}</p>
          <Button type="button" onClick={() => setRetryKey(key => key + 1)}>重试加载</Button>
          <Button type="button" onClick={onClose}>返回日历</Button>
        </div>}
      </div>
    </div>, document.body,
  )
}
