function adminSetValue(id,value){const el=document.getElementById(id);if(el)el.value=value||'';}
function adminGetValue(id){const el=document.getElementById(id);return el?el.value.trim():'';}
function adminSetChecked(id,value){const el=document.getElementById(id);if(el)el.checked=!!value;}
function adminGetChecked(id){const el=document.getElementById(id);return el?el.checked:false;}

window.loadSettings=async function(){
  const {data,error}=await sb.from('app_settings').select('*').order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(error)return;
  settingsRow=data;
  if(!data)return;
  adminSetValue('settingAppName',data.app_name||'Mini markeit');
  adminSetValue('settingStoreName',data.store_name||'مینی مارکێت');
  adminSetValue('settingAddress',data.address||'Duhok, Barzan Road, Mini Market');
  adminSetValue('settingPhone',data.phone||'');
  adminSetValue('settingWhatsapp',data.whatsapp||data.whatsapp_number||'');
  adminSetValue('settingDeliveryFee',data.delivery_fee||1500);
  adminSetValue('settingDeliveryTime',data.delivery_time||'60 - 90 خولەک');
  adminSetValue('settingAboutBadini',data.about_badini||data.about||'');
  adminSetValue('settingAboutAr',data.about_ar||'');
  adminSetValue('settingAboutEn',data.about_en||'');
  adminSetValue('settingLogoUrl',data.logo_url||data.logo||'');
  adminSetValue('settingInstagram',data.instagram||'');
  adminSetValue('settingFacebook',data.facebook||'');
  adminSetValue('settingTiktok',data.tiktok||'');
  adminSetChecked('settingIsOpen',data.is_open!==false);
};

window.saveSettings=async function(){
  const payload={
    app_name:adminGetValue('settingAppName')||'Mini markeit',
    store_name:adminGetValue('settingStoreName')||'مینی مارکێت',
    address:adminGetValue('settingAddress'),
    phone:adminGetValue('settingPhone'),
    whatsapp:adminGetValue('settingWhatsapp'),
    delivery_fee:Number(adminGetValue('settingDeliveryFee')||0),
    delivery_time:adminGetValue('settingDeliveryTime'),
    about_badini:adminGetValue('settingAboutBadini'),
    about_ar:adminGetValue('settingAboutAr'),
    about_en:adminGetValue('settingAboutEn'),
    logo_url:adminGetValue('settingLogoUrl'),
    instagram:adminGetValue('settingInstagram'),
    facebook:adminGetValue('settingFacebook'),
    tiktok:adminGetValue('settingTiktok'),
    is_open:adminGetChecked('settingIsOpen'),
    updated_at:new Date().toISOString()
  };
  const result=settingsRow&&settingsRow.id?await sb.from('app_settings').update(payload).eq('id',settingsRow.id):await sb.from('app_settings').insert(payload).select().single();
  if(result.error){alert('هەڵە: '+result.error.message);return;}
  await window.loadSettings();
  if(typeof toast==='function')toast('ڕێکخستن پاشەکەوت بوو');
};