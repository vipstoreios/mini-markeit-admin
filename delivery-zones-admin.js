let deliveryZones=[];
let editingDeliveryZoneId=null;

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    dzInjectPage();
    dzPatchLoadAllData();
    dzPatchShowPage();
    dzLoadZones();
  },300);
});

function dzPatchLoadAllData(){
  if(window.__dzLoadPatched)return;
  window.__dzLoadPatched=true;
  const old=window.loadAllData;
  window.loadAllData=async function(){
    if(old) await old();
    await dzLoadZones();
  };
}

function dzPatchShowPage(){
  if(window.__dzShowPatched)return;
  window.__dzShowPatched=true;
  const old=window.showPage;
  window.showPage=function(page){
    if(old) old(page);
    if(page==='delivery-zones'){
      setText('pageTitle','Delivery fees');
      dzLoadZones();
    }
  };
}

function dzInjectPage(){
  const sidebar=document.querySelector('.sidebar');
  const settingsNav=document.querySelector('.nav[data-page="settings"]');
  if(sidebar&&!document.querySelector('.nav[data-page="delivery-zones"]')){
    const btn=document.createElement('button');
    btn.className='nav';
    btn.dataset.page='delivery-zones';
    btn.textContent='Delivery fees';
    btn.onclick=()=>showPage('delivery-zones');
    if(settingsNav) sidebar.insertBefore(btn,settingsNav); else sidebar.appendChild(btn);
  }

  const content=document.querySelector('.content');
  if(!content||document.getElementById('page-delivery-zones'))return;
  const page=document.createElement('section');
  page.id='page-delivery-zones';
  page.className='page hidden';
  page.innerHTML=`
    <div class="panel">
      <div class="panel-head">
        <div><h2>Delivery zones</h2><p class="muted">Add areas such as Shndokha 2000 IQD or Masike 1500 IQD.</p></div>
        <button class="btn secondary" onclick="dzLoadZones()">Refresh</button>
      </div>
      <div class="form-grid">
        <label>Area name<input id="dzName" placeholder="Shndokha" /></label>
        <label>Delivery fee<input id="dzFee" type="number" placeholder="2000" /></label>
        <label>Sort order<input id="dzSort" type="number" placeholder="1" /></label>
        <label class="check"><input id="dzActive" type="checkbox" checked />Active</label>
      </div>
      <div class="modal-actions"><button class="btn primary" onclick="dzSaveZone()">Save delivery zone</button><button class="btn secondary" onclick="dzClearForm()">Clear</button></div>
      <div class="table-wrap"><table><thead><tr><th>Area</th><th>Fee</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead><tbody id="dzTable"></tbody></table></div>
    </div>`;
  content.appendChild(page);
}

async function dzLoadZones(){
  if(typeof sb==='undefined'||!sb)return;
  const table=document.getElementById('dzTable');
  if(!table)return;
  const {data,error}=await sb.from('delivery_zones').select('*').order('sort_order',{ascending:true});
  if(error){
    table.innerHTML=`<tr><td colspan="5" class="empty">Create delivery_zones table first. ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  deliveryZones=data||[];
  dzRenderZones();
}

function dzRenderZones(){
  const table=document.getElementById('dzTable');
  if(!table)return;
  if(!deliveryZones.length){
    table.innerHTML='<tr><td colspan="5" class="empty">No delivery zones yet</td></tr>';
    return;
  }
  table.innerHTML=deliveryZones.map(z=>`
    <tr>
      <td><b>${escapeHtml(z.name||'-')}</b></td>
      <td>${formatMoney(z.delivery_fee||0)}</td>
      <td>#${Number(z.sort_order||0)}</td>
      <td><span class="badge ${z.is_active!==false?'done':'off'}">${z.is_active!==false?'Active':'Off'}</span></td>
      <td><button class="btn mini" onclick="dzEditZone('${z.id}')">Edit</button><button class="btn danger mini" onclick="dzDeleteZone('${z.id}')">Delete</button></td>
    </tr>`).join('');
}

function dzEditZone(id){
  const z=deliveryZones.find(x=>String(x.id)===String(id));
  if(!z)return;
  editingDeliveryZoneId=id;
  setValue('dzName',z.name||'');
  setValue('dzFee',z.delivery_fee||0);
  setValue('dzSort',z.sort_order||0);
  setChecked('dzActive',z.is_active!==false);
}

function dzClearForm(){
  editingDeliveryZoneId=null;
  setValue('dzName','');
  setValue('dzFee','');
  setValue('dzSort',deliveryZones.length+1);
  setChecked('dzActive',true);
}

async function dzSaveZone(){
  const name=getValue('dzName');
  if(!name){alert('Write area name');return;}
  const payload={name,delivery_fee:Number(getValue('dzFee')||0),sort_order:Number(getValue('dzSort')||0),is_active:getChecked('dzActive'),updated_at:new Date().toISOString()};
  const result=editingDeliveryZoneId?await sb.from('delivery_zones').update(payload).eq('id',editingDeliveryZoneId):await sb.from('delivery_zones').insert(payload);
  if(result.error){alert(result.error.message);return;}
  dzClearForm();
  await dzLoadZones();
  toast('Delivery zone saved');
}

async function dzDeleteZone(id){
  if(!confirm('Delete this delivery zone?'))return;
  const {error}=await sb.from('delivery_zones').delete().eq('id',id);
  if(error){alert(error.message);return;}
  await dzLoadZones();
  toast('Delivery zone deleted');
}
