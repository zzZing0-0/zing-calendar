import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RandomPoolGroup, RandomPoolItem } from '../../types'
import { availableWheelGroups, chooseWeightedFromItems, cryptoUnit, validMixedRandomItems, validRandomItems } from '../../domain/randomWheel'

type Props={groups:RandomPoolGroup[];items:RandomPoolItem[];mixedPoolItemIds:string[];onClose:()=>void}
const MIXED_POOL_ID='__mixed__'
const COLORS=['#b8d7b2','#f4d983','#e8afb8','#c4b2d8','#a9d8d0','#f3c39e']
function wheelLabelTokens(text: string) {
  return text.trim().match(/[A-Za-z0-9]+(?:['’_-][A-Za-z0-9]+)*|[^\s]/gu) ?? []
}
function joinWheelTokens(tokens: string[]) {
  return tokens.reduce((result, token, index) => {
    if (!index) return token
    const previous = tokens[index - 1]
    const latin = /^[A-Za-z0-9]/.test(token) && /[A-Za-z0-9]$/.test(previous)
    return `${result}${latin ? ' ' : ''}${token}`
  }, '')
}
function wheelLabelHasReadableWidth(ctx: CanvasRenderingContext2D, maxWidth: number) {
  return maxWidth >= ctx.measureText('…').width * 1.35
}
function wheelLabelLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const clean = text.trim()
  if (!clean) return []
  if (ctx.measureText(clean).width <= maxWidth) return [clean]
  const tokens = wheelLabelTokens(clean)
  const lines: string[] = []
  let current: string[] = []
  for (const token of tokens) {
    const candidate = joinWheelTokens([...current, token])
    if (current.length && ctx.measureText(candidate).width > maxWidth) {
      lines.push(joinWheelTokens(current))
      current = [token]
    } else current.push(token)
  }
  if (current.length) lines.push(joinWheelTokens(current))
  if (lines.length <= maxLines && lines.every(line => ctx.measureText(line).width <= maxWidth)) return lines
  const visible = lines.slice(0, maxLines)
  let last = visible[maxLines - 1] ?? ''
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = Array.from(last).slice(0, -1).join('')
  visible[maxLines - 1] = `${last}…`
  return visible
}

export function RandomWheelPage({groups,items,mixedPoolItemIds,onClose}:Props){
  const canvasRef=useRef<HTMLCanvasElement|null>(null), spinRef=useRef(0), audioRef=useRef<AudioContext|null>(null)
  const validGroups=useMemo(()=>availableWheelGroups(groups,items),[groups,items])
  const mixed=useMemo(()=>validMixedRandomItems(items,mixedPoolItemIds),[items,mixedPoolItemIds])
  const [groupId,setGroupId]=useState(()=>mixed.length>=2?MIXED_POOL_ID:(validGroups[0]?.id??groups[0]?.id??''))
  const [rotation,setRotation]=useState(0),[spinning,setSpinning]=useState(false),[winner,setWinner]=useState<RandomPoolItem|null>(null),[lampFlash,setLampFlash]=useState(false)
  const current=useMemo(()=>groupId===MIXED_POOL_ID?mixed:validRandomItems(items,groupId),[items,groupId,mixed])
  useEffect(()=>{if((groupId===MIXED_POOL_ID&&mixed.length<2)||(groupId!==MIXED_POOL_ID&&!groups.some(g=>g.id===groupId)))setGroupId(mixed.length>=2?MIXED_POOL_ID:(validGroups[0]?.id??groups[0]?.id??''))},[groups,validGroups,groupId,mixed.length])
  useEffect(()=>{let flashTimer=0,cycleTimer=0;const schedule=()=>{flashTimer=window.setTimeout(()=>{setLampFlash(true);cycleTimer=window.setTimeout(()=>{setLampFlash(false);schedule()},720)},1440)};schedule();return()=>{window.clearTimeout(flashTimer);window.clearTimeout(cycleTimer)}},[])
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);const s=rect.width,c=s/2,r=s*.475,total=current.reduce((a,b)=>a+b.weight,0)||1;ctx.clearRect(0,0,s,s);let a=-Math.PI/2;current.forEach((item,i)=>{const sweep=item.weight/total*Math.PI*2,mid=a+sweep/2;ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,a,a+sweep);ctx.closePath();ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=3;ctx.stroke();ctx.save();ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r-4,a+.012,a+sweep-.012);ctx.closePath();ctx.clip();const labelRadius=r*.72;const arcWidth=labelRadius*sweep*.82;const maxWidth=Math.min(r*.58,arcWidth);const fontSize=Math.max(12,Math.min(s*.031,maxWidth*.22));ctx.translate(c+Math.cos(mid)*labelRadius,c+Math.sin(mid)*labelRadius);ctx.rotate(mid+Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#30352f';ctx.font=`700 ${fontSize}px system-ui`;if(!wheelLabelHasReadableWidth(ctx,maxWidth)){ctx.restore();a+=sweep;return}const lineHeight=fontSize*1.08,maxLines=Math.max(1,Math.floor((r*.58)/lineHeight));const lines=wheelLabelLines(ctx,item.name,maxWidth,maxLines);lines.forEach((line,lineIndex)=>ctx.fillText(line,0,(lineIndex-(lines.length-1)/2)*lineHeight));ctx.restore();a+=sweep})},[current])
  const ensureAudio=()=>{
    const AudioCtor=window.AudioContext
    if(!AudioCtor)return null
    if(!audioRef.current)audioRef.current=new AudioCtor()
    if(audioRef.current.state==='suspended')void audioRef.current.resume()
    return audioRef.current
  }
  const tone=(frequency:number,duration:number,volume:number,type:OscillatorType='triangle',when=0)=>{
    const audio=audioRef.current;if(!audio)return
    const now=audio.currentTime+when,osc=audio.createOscillator(),gain=audio.createGain()
    osc.type=type;osc.frequency.setValueAtTime(frequency,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+duration+.02)
  }
  const playSpinSound=()=>{let when=0;for(let i=0;i<22;i+=1){tone(720,.025,.022,'square',when);when+=.075+i*.008}}
  const playLanding=()=>{tone(392,.16,.055,'triangle');tone(587,.22,.045,'triangle',.08);tone(784,.30,.035,'sine',.17)}
  const spin=()=>{if(spinning||current.length<2)return;ensureAudio();playSpinSound();setWinner(null);const unit=cryptoUnit(),chosen=chooseWeightedFromItems(current,unit);if(!chosen)return;const total=current.reduce((a,b)=>a+b.weight,0);let before=0;for(const item of current){if(item.id===chosen.id)break;before+=item.weight}const mid=(before+chosen.weight/2)/total*360;const target=360-mid;spinRef.current+=5*360+((target-(spinRef.current%360)+360)%360);setSpinning(true);setRotation(spinRef.current);window.setTimeout(()=>{setSpinning(false);playLanding();setWinner(chosen)},3900)}
  return <div className="random-wheel-page"><div className="random-wheel-top random-wheel-page-top"><button onClick={onClose}>‹ 返回</button><div><span>RANDOM PICKER</span><div className="random-wheel-title-row"><h2>幸运大转盘</h2>{(groups.length>0||mixed.length>=2)&&<select className="random-wheel-group-select" aria-label="选择幸运池分组" value={groupId} disabled={spinning} onChange={e=>{setGroupId(e.target.value);setWinner(null)}}>{mixed.length>=2&&<option value={MIXED_POOL_ID}>混合池</option>}{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>}</div></div><i/></div><p className="random-wheel-intro">不是任务，也不是命令。转起来的时候，看看你心里偷偷希望哪一格来到最上方。</p>{groups.length===0?<div className="random-wheel-empty">还没有幸运池。先去「幸运池」添加分组和项目吧。</div>:<><div className="ferris-wrap"><div className="ferris-wheel"><div className="ferris-disc" style={{transform:`rotate(${rotation}deg)`,transition:spinning?'transform 3.8s cubic-bezier(.12,.72,.08,1)':'none'}}><canvas ref={canvasRef}/></div><div className={`ferris-rim${lampFlash?' ferris-rim-flash':''}`}>{Array.from({length:16},(_,i)=><b key={i} style={{'--i':i,'--lamp-delay':`${i*90}ms`} as CSSProperties}/>)}</div></div><div className="ferris-marker">◆</div><div className="ferris-hub">LUCK!<small>随它去吧</small></div><div className="ferris-stand"><i/><i/><b>✦　✦　✦</b></div></div><button className="random-spin-button" disabled={spinning||current.length<2} onClick={spin}>{spinning?'转呀转呀…':'转一下 🎲'}</button>{current.length<2&&<p className="random-wheel-hint">{groupId===MIXED_POOL_ID?'混合池需要至少 2 个已选择、权重大于 0 的项目。':'这个分组需要至少 2 个已参与、权重大于 0 的项目。'}</p>}</>}{winner&&<div className="random-prize-backdrop" onClick={()=>setWinner(null)}><div className="random-prize-card" onClick={e=>e.stopPropagation()}><span>🎟️ 今日幸运</span><h3>{winner.name}</h3>{winner.amount!=null&&<p>{winner.amount}{winner.unit?` ${winner.unit}`:''}</p>}<button onClick={()=>setWinner(null)}>好耶 ✨</button></div></div>}</div>
}
