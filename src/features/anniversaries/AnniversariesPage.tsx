import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeading } from '../../components/ui/PageHeading'
import type { AnniversaryPageRow } from '../../domain/calendar'
import {
  anniversaryDistanceLabel, anniversaryIcon
} from '../../domain/calendar'
import type { Anniversary } from '../../types'
import type { MainView } from '../navigation/navigationTypes'

export interface AnniversariesPageProps {
  anniversaryPageRows: AnniversaryPageRow[]
  mainView: MainView
  openAnniversaryEditor: (anniversary?: Anniversary | undefined) => void
  today: Date
}

export function AnniversariesPage({
  anniversaryPageRows,
  mainView,
  openAnniversaryEditor,
  today
}: AnniversariesPageProps) {
  return <>
{mainView === 'anniversaries' && (
        <section className="anniversary-page">
          <PageHeading title={<>纪念日</>} eyebrow={<>ANNIVERSARIES</>} actions={<><Button className="page-add-button" type="button" onClick={() => openAnniversaryEditor()}>＋</Button></>} />
          {anniversaryPageRows.length === 0 ? <EmptyState className="page-empty">还没有纪念日。</EmptyState> : (
            <div className="anniversary-page-list">
              {anniversaryPageRows.map(({anniversary, occurrence}) => (
                <Button key={anniversary.id} className="anniversary-page-row" type="button" onClick={() => openAnniversaryEditor(anniversary)}>
                  <span className="anniversary-page-icon">{anniversaryIcon(anniversary.type)}</span>
                  <span className="anniversary-page-main"><strong>{anniversary.title}</strong><small>{anniversary.calendar==='lunar' ? `农历 ${anniversary.isLeapMonth?'闰':''}${anniversary.month}月${anniversary.day}日` : `${anniversary.month}月${anniversary.day}日`}</small></span>
                  <span className="anniversary-page-next">
                    {anniversary.repeatYearly && occurrence && anniversary.year && occurrence.getFullYear() >= anniversary.year && anniversary.type === 'birthday' && (
                      <strong>{occurrence.getFullYear() === anniversary.year ? '出生日' : `${occurrence.getFullYear() - anniversary.year}岁生日`}</strong>
                    )}
                    {anniversary.repeatYearly && occurrence && anniversary.year && occurrence.getFullYear() >= anniversary.year && anniversary.type === 'anniversary' && (
                      <strong>{occurrence.getFullYear() === anniversary.year ? '纪念日当天' : `${occurrence.getFullYear() - anniversary.year}周年`}</strong>
                    )}
                    <small>{anniversaryDistanceLabel(anniversary, occurrence, today)}</small>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </section>
      )}
  </>
}
