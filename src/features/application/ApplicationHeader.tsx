import type * as React from 'react'
import { Button } from '../../components/ui/Button'
import { orderedCategories } from '../../domain/modulePriority'
import type { SearchFilter, SearchResult } from '../../domain/search'
import type { Tag } from '../../types'
import { DesktopNavigationDrawer } from '../navigation/DesktopNavigationDrawer'
import type { MainView } from '../navigation/navigationTypes'

export interface ApplicationHeaderProps {
  desktopSidebarCollapsed: boolean
  greeting: string
  highlightSearch: (text: string) => string | React.ReactNode[]
  mainView: MainView
  mobileSearchVisible: boolean
  moduleOrder: ("task" | "note" | "habit" | "journal" | "anniversary" | "focus")[]
  normalizedSearch: string
  openSearchResult: (result: SearchResult) => void
  searchDateLabel: (result: SearchResult) => string
  searchFilter: SearchFilter
  searchMarker: (result: SearchResult) => React.JSX.Element
  searchOpen: boolean
  searchQuery: string
  searchResults: SearchResult[]
  searchWrapRef: React.RefObject<HTMLDivElement | null>
  selectedSearchTag: Tag | undefined
  setMobileSearchVisible: React.Dispatch<React.SetStateAction<boolean>>
  setSearchFilter: React.Dispatch<React.SetStateAction<SearchFilter>>
  setSearchOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  switchMainView: (view: MainView) => void
  tagKeyword: string
  tagSearchMode: boolean
  tagSuggestions: Tag[]
  toggleDesktopSidebar: () => void
}

export function ApplicationHeader({
  desktopSidebarCollapsed,
  greeting,
  highlightSearch,
  mainView,
  mobileSearchVisible,
  moduleOrder,
  normalizedSearch,
  openSearchResult,
  searchDateLabel,
  searchFilter,
  searchMarker,
  searchOpen,
  searchQuery,
  searchResults,
  searchWrapRef,
  selectedSearchTag,
  setMobileSearchVisible,
  setSearchFilter,
  setSearchOpen,
  setSearchQuery,
  switchMainView,
  tagKeyword,
  tagSearchMode,
  tagSuggestions,
  toggleDesktopSidebar
}: ApplicationHeaderProps) {
  return <>
<header className={`topbar${mainView==='calendar'?' calendar-topbar':''}`}>
        <div className={`brand-block${mainView==='settings' ? ' settings-brand' : ''}${mobileSearchVisible ? " search-open" : ""}`}>
          <Button className="brand-mark" type="button" aria-label="打开或收起搜索" aria-expanded={mobileSearchVisible} onClick={()=>{setMobileSearchVisible(current=>!current);setSearchOpen(false)}}><span className="brand-mark-desktop">Z</span><span className="brand-mark-mobile" aria-hidden="true">🔍</span></Button>
          <div className="brand-copy">
            <p>{greeting}</p>
          </div>
        </div>

        <Button type="button" className="desktop-sidebar-toggle" onClick={toggleDesktopSidebar}
          aria-label={desktopSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          aria-expanded={!desktopSidebarCollapsed} title={desktopSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3.5" width="18" height="17" rx="3" />
            <path d="M9 3.5v17" />
            <path d={desktopSidebarCollapsed ? 'm14 10 2 2-2 2' : 'm16 10-2 2 2 2'} />
          </svg>
        </Button>

        {mobileSearchVisible && <Button className="mobile-search-backdrop" type="button" aria-label="关闭搜索" onClick={()=>{setMobileSearchVisible(false);setSearchOpen(false)}} />}
        <div className={`global-search-wrap${mobileSearchVisible ? ' mobile-open' : ''}`} ref={searchWrapRef}>
          <span className="global-search-icon">⌕</span>
          <input value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }} placeholder="搜索内容，或输入 #标签 筛选" aria-label="全局搜索" />
          {searchQuery && <Button type="button" className="search-clear" onClick={() => setSearchQuery('')} aria-label="清空搜索">×</Button>}
          {searchOpen && normalizedSearch && (
            <div className="search-panel">
              <div className="search-filters">
                {orderedCategories([['all','全部'],['task','任务'],['journal','记录'],['note','笔记'],['anniversary','纪念日'],['habit','习惯']] as const,moduleOrder).map(([value,label]) => <Button key={value} type="button" className={searchFilter===value?'active':''} onClick={() => setSearchFilter(value)}>{label}</Button>)}
              </div>
              {tagSearchMode && <div className="search-tag-suggestions" aria-label="标签建议">
                {tagSuggestions.map(tag => <Button key={tag.id} type="button" className={selectedSearchTag?.id===tag.id?'active':''}
                  onClick={() => { setSearchQuery(`#${tag.name}${tagKeyword ? ` ${tagKeyword}` : ''}`); setSearchOpen(true) }}>
                  <span className="tag-color-dot" style={{backgroundColor:tag.color}} />#{tag.name}
                </Button>)}
              </div>}
              <div className="search-results">
                {searchResults.length === 0 ? <p className="search-empty">{tagSearchMode && !selectedSearchTag ? '请选择完整标签以查看关联内容。' : '没有找到结果。'}</p> : searchResults.map(result => (
                  <Button key={`${result.kind}-${result.id}`} type="button" className="search-result" onClick={() => openSearchResult(result)}>
                    <span className={`search-kind kind-${result.kind}`}>{searchMarker(result)}</span>
                    <span className="search-result-main"><strong>{tagSearchMode ? result.title : highlightSearch(result.title)}</strong>{result.snippet && <small>{tagSearchMode ? result.snippet : highlightSearch(result.snippet)}</small>}</span>
                    <time>{searchDateLabel(result)}</time>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DesktopNavigationDrawer active={mainView} onNavigate={switchMainView} collapsed={desktopSidebarCollapsed} />
      </header>
  </>
}
