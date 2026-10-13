import assert from 'node:assert/strict';
import test from 'node:test';
import { createLayoutAdapter } from '../../runtime/layout-adapter.mjs';

test('route changes retire the previous home marker', () => {
  const element = () => { const attrs = new Map(); return { isConnected: true, getBoundingClientRect: () => ({left:0,top:0,right:900,bottom:700,width:900,height:700}), closest: () => null, getAttribute: key => attrs.get(key) ?? null, setAttribute: (key,value) => attrs.set(key,value), removeAttribute: key => attrs.delete(key) }; };
  const main=element(), home=element(), composer=element(), secondary=element();
  let secondaryActive=false;
  const document={documentElement:{getAttribute:()=>null},querySelectorAll: selector => selector==='main'?[main]:selector==='home'?[home]:selector==='composer'?[composer]:selector==='secondary'&&secondaryActive?[secondary]:[]};
  const window={innerWidth:1280,innerHeight:800,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
  const contract={selectors:[{key:'shell-main',selector:'main'},{key:'home-route-css',selector:'home'},{key:'home-composer',selector:'composer'},{key:'secondary-page',selector:'secondary'}]};
  const adapter=createLayoutAdapter(document,window,contract);
  assert.equal(adapter.discover().page,'home');
  secondaryActive=true;
  assert.equal(adapter.discover().page,'secondary');
  secondaryActive=false;
  assert.equal(adapter.discover().page,'home');
  adapter.cleanup();
  assert.equal(main.getAttribute('data-ds-part'),null);
  assert.equal(home.getAttribute('data-ds-part'),null);
});
