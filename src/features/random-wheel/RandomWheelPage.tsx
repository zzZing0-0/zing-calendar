import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RandomPoolGroup, RandomPoolItem } from '../../types'
import { availableWheelGroups, chooseWeightedItem, cryptoUnit, validRandomItems } from '../../domain/randomWheel'

type Props={groups:RandomPoolGroup[];items:RandomPoolItem[];onClose:()=>void}
const COLORS=['#b8d7b2','#f4d983','#e8afb8','#c4b2d8','#a9d8d0','#f3c39e']
export function RandomWheelPage({groups,items,onClose}:Props){
  const canvasRef=useRef<HTMLCanvasElement|null>(null), spinRef=useRef(0), audioRef=useRef<AudioContext|null>(null)
  const validGroups=useMemo(()=>availableWheelGroups(groups,items),[groups,items])
  const [groupId,setGroupId]=useState(()=>validGroups[0]?.id??groups[0]?.id??'')
  const [rotation,setRotation]=useState(0),[spinning,setSpinning]=useState(false),[winner,setWinner]=useState<RandomPoolItem|null>(null)
  const current=useMemo(()=>validRandomItems(items,groupId),[items,groupId])
  useEffect(()=>{if(!groups.some(g=>g.id===groupId))setGroupId(validGroups[0]?.id??groups[0]?.id??'')},[groups,validGroups,groupId])
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);const s=rect.width,c=s/2,r=s*.475,total=current.reduce((a,b)=>a+b.weight,0)||1;ctx.clearRect(0,0,s,s);let a=-Math.PI/2;current.forEach((item,i)=>{const sweep=item.weight/total*Math.PI*2,mid=a+sweep/2;ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,a,a+sweep);ctx.closePath();ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=3;ctx.stroke();ctx.save();ctx.translate(c+Math.cos(mid)*r*.61,c+Math.sin(mid)*r*.61);ctx.rotate(mid+Math.PI/2);ctx.textAlign='center';ctx.fillStyle='#30352f';ctx.font=`700 ${Math.max(13,s*.031)}px system-ui`;ctx.fillText(item.name,0,0);ctx.font=`600 ${Math.max(11,s*.022)}px system-ui`;ctx.fillStyle='#62685f';const meta=[item.amount!=null?`${item.amount}${item.unit?' '+item.unit:''}`:'',`${Math.round(item.weight/total*100)}%`].filter(Boolean).join(' · ');ctx.fillText(meta,0,s*.04);ctx.restore();a+=sweep})},[current])
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
  const spin=()=>{if(spinning||current.length<2)return;ensureAudio();playSpinSound();setWinner(null);const unit=cryptoUnit(),chosen=chooseWeightedItem(items,groupId,unit);if(!chosen)return;const total=current.reduce((a,b)=>a+b.weight,0);let before=0;for(const item of current){if(item.id===chosen.id)break;before+=item.weight}const mid=(before+chosen.weight/2)/total*360;const target=360-mid;spinRef.current+=5*360+((target-(spinRef.current%360)+360)%360);setSpinning(true);setRotation(spinRef.current);window.setTimeout(()=>{setSpinning(false);playLanding();setWinner(chosen)},3900)}
  return <div className="random-wheel-page"><div className="random-wheel-top"><button onClick={onClose}>‹ 返回</button><div><span>RANDOM PICKER</span><div className="random-wheel-title-row"><h2>幸运大转盘</h2>{groups.length>0&&<select className="random-wheel-group-select" aria-label="选择幸运池分组" value={groupId} disabled={spinning} onChange={e=>{setGroupId(e.target.value);setWinner(null)}}>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>}</div></div><i/></div><p className="random-wheel-intro">不是任务，也不是命令。转起来的时候，看看你心里偷偷希望哪一格来到最上方。</p>{groups.length===0?<div className="random-wheel-empty">还没有幸运池。先去「幸运池」添加分组和项目吧。</div>:<><div className="ferris-wrap"><div className="ferris-wheel"><div className="ferris-disc" style={{transform:`rotate(${rotation}deg)`,transition:spinning?'transform 3.8s cubic-bezier(.12,.72,.08,1)':'none'}}><canvas ref={canvasRef}/></div><div className="ferris-rim">{Array.from({length:16},(_,i)=><b key={i} style={{'--i':i,'--lamp-delay':`${i*90}ms`} as CSSProperties}/>)}</div></div><div className="ferris-marker">◆</div><div className="ferris-hub">LUCK!<small>随它去吧</small></div><div className="ferris-stand"><i/><i/><b>✦　✦　✦</b></div></div><button className="random-spin-button" disabled={spinning||current.length<2} onClick={spin}>{spinning?'转呀转呀…':'转一下 🎲'}</button>{current.length<2&&<p className="random-wheel-hint">这个分组需要至少 2 个已参与、权重大于 0 的项目。</p>}</>}{winner&&<div className="random-prize-backdrop" onClick={()=>setWinner(null)}><div className="random-prize-card" onClick={e=>e.stopPropagation()}><span>🎟️ 今日幸运</span><h3>{winner.name}</h3>{winner.amount!=null&&<p>{winner.amount}{winner.unit?` ${winner.unit}`:''}</p>}<button onClick={()=>setWinner(null)}>好耶 ✨</button></div></div>}</div>
}
