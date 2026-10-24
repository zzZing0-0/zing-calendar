import { Component } from 'react'
import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { KEY, download } from './storage'
export class GachaLabBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <div className="gacha-lab-recovery" role="alert"><p>抽奖模拟器暂时无法读取或显示数据。原始数据已保留，请先导出备份；你仍可安全返回日历。</p>
      <Button onClick={() => { try { const raw = localStorage.getItem(KEY); if (raw !== null) download('gacha-original-data.json', raw, true) } catch { /* Storage may itself be unavailable; keep navigation accessible. */ } }}>导出原始数据</Button>
      <Button onClick={() => this.setState({ failed: false })}>重试加载</Button><Button onClick={this.props.onClose}>返回日历</Button>
    </div>
  }
}
