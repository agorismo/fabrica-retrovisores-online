const vm=require('vm'),fs=require('fs');
function stub(){const f=function(){};const p=new Proxy(f,{get(t,k){if(k===Symbol.iterator)return function*(){};if(k===Symbol.toPrimitive)return()=> '';if(k==='length')return 0;if(k==='then')return undefined;return p},apply(){return p},construct(){return p},set(){return true}});return p}
function create(html){
 const sc=html.match(/<script>([\s\S]*)<\/script>/)[1];
 const store={};const S=stub();
 const ctx={console,setInterval,clearInterval,setTimeout,clearTimeout,Math,Date,JSON,Object,Array,String,Number,Promise,parseInt,parseFloat,isNaN,Set,Map,RegExp,Error,
  document:S,window:S,navigator:S,getComputedStyle:()=>S,requestAnimationFrame:()=>0,cancelAnimationFrame:()=>0,ResizeObserver:function(){return S},matchMedia:()=>S,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
  AudioContext:undefined,webkitAudioContext:undefined,performance:{now:()=>Date.now()}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(sc,ctx,{filename:'game-script'});
 return ctx}
module.exports={create,run:(ctx,code)=>vm.runInContext(code,ctx)};
