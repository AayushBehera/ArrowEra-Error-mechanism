import { useEffect, useState } from 'react'
import { fetchDeploymentStatus, fetchIntegrations, fetchObservabilityLogs, fetchRequestTraces } from '../api/operations.ts'

type Provider = 'render' | 'vercel'
const panel='rounded-2xl border border-slate-800 bg-[#0d1421] p-5'
const label='text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500'
function Card({title,children}:{title:string;children:React.ReactNode}){return <section className={panel}><h2 className="mb-4 text-sm font-semibold text-slate-100">{title}</h2>{children}</section>}
function Pill({ok}:{ok:boolean}){return <span className={'rounded-full border px-2 py-1 text-[9px] font-semibold uppercase '+(ok?'border-emerald-400/20 bg-emerald-400/5 text-emerald-300':'border-amber-400/20 bg-amber-400/5 text-amber-300')}>{ok?'Connected':'Not configured'}</span>}
export function ObservabilityPanel(){
 const [provider,setProvider]=useState<Provider>('render')
 const [integrations,setIntegrations]=useState<Record<string,{configured:boolean;[key:string]:unknown}>|null>(null)
 const [deployment,setDeployment]=useState<Record<string,unknown>|null>(null)
 const [logs,setLogs]=useState<{provider:string;configured:boolean;logs:unknown[];message?:string;error?:string}|null>(null)
 const [traces,setTraces]=useState<{traceId:string;method:string;path:string;status:number;durationMs:number;timestamp:string}[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState<string|null>(null)
 async function refresh(next=provider){
  setLoading(true);setError(null)
  const results=await Promise.allSettled([fetchIntegrations(),fetchDeploymentStatus(next),fetchObservabilityLogs(next),fetchRequestTraces()])
  if(results[0].status==='fulfilled')setIntegrations(results[0].value)
  if(results[1].status==='fulfilled')setDeployment(results[1].value)
  if(results[2].status==='fulfilled')setLogs(results[2].value)
  if(results[3].status==='fulfilled')setTraces(results[3].value.traces)
  const failed=results.find(x=>x.status==='rejected')
  if(failed?.status==='rejected')setError(failed.reason instanceof Error?failed.reason.message:'Observability refresh failed.')
  setLoading(false)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{const frame=requestAnimationFrame(()=>{void refresh('render')});return()=>cancelAnimationFrame(frame)},[])
 const deployments=Array.isArray(deployment?.deployments)?deployment.deployments as Record<string,unknown>[]:[]
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className={label}>Runtime intelligence</p><h1 className="mt-1 text-xl font-semibold text-white">Observability & deployment providers</h1><p className="mt-1 text-xs text-slate-500">Correlate application requests, provider events and deployment history.</p></div><button onClick={()=>void refresh()} disabled={loading} className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300">{loading?'Refreshing…':'Refresh signals'}</button></div>
  {error&&<p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200">{error}</p>}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{name:'GitHub Actions',ok:Boolean(integrations?.githubActions?.configured)},{name:'Render',ok:Boolean(integrations?.render?.configured)},{name:'Vercel',ok:Boolean(integrations?.vercel?.configured)},{name:'Request traces',ok:Boolean(integrations?.telemetry?.requestTraces)}].map(({name,ok})=><div key={name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0d1421] p-4"><div><p className={label}>{name}</p><p className="mt-2 text-xs text-slate-300">{ok?'Integration active':'Credentials / integration pending'}</p></div><Pill ok={ok}/></div>)}</div>
  <div className="flex flex-wrap gap-2"><button onClick={()=>{setProvider('render');void refresh('render')}} className={'rounded-lg px-3 py-2 text-[10px] font-semibold '+(provider==='render'?'bg-violet-500/15 text-violet-200':'border border-slate-800 text-slate-400')}>Render</button><button onClick={()=>{setProvider('vercel');void refresh('vercel')}} className={'rounded-lg px-3 py-2 text-[10px] font-semibold '+(provider==='vercel'?'bg-violet-500/15 text-violet-200':'border border-slate-800 text-slate-400')}>Vercel</button></div>
  <div className="grid gap-4 xl:grid-cols-2">
   <Card title={provider.toUpperCase()+' deployment history'}>{!deployment?<p className="text-xs text-slate-500">Loading provider data…</p>:deployment.configured===false?<p className="text-xs text-amber-200">{String(deployment.message||'Provider credentials are not configured.')}</p>:deployments.length?deployments.map((item,i)=><div key={String(item.id||i)} className="flex items-center justify-between gap-3 border-b border-slate-800 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-200">{String(item.message||item.id||item.url||'Deployment')}</p><p className="mt-1 text-[9px] text-slate-500">{item.createdAt?new Date(String(item.createdAt)).toLocaleString():'Timestamp unavailable'}</p></div><span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-[9px] text-slate-300">{String(item.status||'unknown')}</span></div>):<p className="text-xs text-slate-500">{String(deployment.error||'No deployment records returned.')}</p>}</Card>
   <Card title={provider.toUpperCase()+' runtime logs'}>{!logs?<p className="text-xs text-slate-500">Loading logs…</p>:!logs.configured?<p className="text-xs text-amber-200">{logs.message}</p>:logs.error?<p className="text-xs text-rose-300">{logs.error}</p>:logs.logs.length?<div className="max-h-80 space-y-2 overflow-auto">{logs.logs.map((entry,i)=><pre key={i} className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-[9px] leading-relaxed text-slate-400">{typeof entry==='string'?entry:JSON.stringify(entry)}</pre>)}</div>:<p className="text-xs text-slate-500">{logs.message||'No provider log records returned.'}</p>}</Card>
  </div>
  <Card title="Request trace explorer"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-slate-500">Per-request trace IDs, HTTP outcome and latency. Current process memory only.</p><span className="font-mono text-[9px] text-slate-500">{traces.length} recent traces</span></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500"><th className="py-2">Request</th><th>Trace ID</th><th>Status</th><th>Latency</th><th>Time</th></tr></thead><tbody>{traces.map(t=><tr key={t.traceId} className="border-b border-slate-800/70 text-[10px] text-slate-300"><td className="py-2 font-mono">{t.method} {t.path}</td><td className="font-mono text-violet-300">{t.traceId.slice(0,12)}</td><td className={t.status>=500?'text-rose-300':t.status>=400?'text-amber-300':'text-emerald-300'}>{t.status}</td><td className="font-mono">{t.durationMs} ms</td><td className="text-slate-500">{new Date(t.timestamp).toLocaleTimeString()}</td></tr>)}</tbody></table>{!traces.length&&<p className="py-5 text-center text-xs text-slate-500">Requests will appear as the application receives traffic.</p>}</div></Card>
  <p className="text-[9px] leading-relaxed text-slate-600">Provider API logs and deployment history require server-side credentials. Request traces are process-local; persistent distributed tracing requires an external telemetry collector and storage.</p>
 </div>
}
