import 'dotenv/config';
import express from 'express';
import multer from 'multer';
const app=express();
app.use(express.static('public'));
app.use(express.json());
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024,files:20}});
const token=process.env.NOTION_TOKEN,db=process.env.NOTION_DATABASE_ID?.replace(/-/g,''),password=process.env.TEAM_PASSWORD;
const hdr=()=>({'Authorization':'Bearer '+token,'Notion-Version':'2022-06-28','Content-Type':'application/json'});
async function notion(path,method='GET',body){const r=await fetch('https://api.notion.com/v1'+path,{method,headers:hdr(),body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.message||'Notion API 오류');return d}
function guard(req,res,next){if(!token||!db||!password)return res.status(503).json({error:'Notion 연결 환경변수가 설정되지 않았습니다.'});if(req.get('x-team-password')!==password)return res.status(401).json({error:'팀 비밀번호가 올바르지 않습니다.'});next()}
const rich=s=>[{type:'text',text:{content:String(s??'').slice(0,1900)}}];
const para=(name,val)=>({object:'block',type:'paragraph',paragraph:{rich_text:rich(name+': '+(typeof val==='string'?val:JSON.stringify(val)))}});
app.post('/api/submit',guard,upload.array('files',20),async(req,res)=>{try{
 const d=JSON.parse(req.body.payload||'{}');
 if(!d.requester||!d.company||!d.product||!d.host||!d.productUrl||!d.keyword||!Array.isArray(d.media)||!d.media.length)throw Error('공통 필수값을 입력해 주세요.');
 const info=await notion('/databases/'+db);
 const title=Object.entries(info.properties||{}).find(([,p])=>p.type==='title')?.[0];if(!title)throw Error('Notion DB 제목 속성이 없습니다.');
 const created=[];
 for(const media of d.media){const s=d.settings?.[media];if(!s||!s.assetMethod||!s.campaignType||!s.budget||!s.target||!s.placements?.length)throw Error(media+' 설정을 확인해 주세요.');
 if(s.assetMethod==='URL'&&!s.assetUrl)throw Error(media+' 소재 URL을 입력해 주세요.');
 if(s.assetMethod==='파일 업로드'&&!req.files?.some(f=>f.originalname.startsWith(media+'__')))throw Error(media+' 소재 파일을 선택해 주세요.');
 const children=[para('요청자',d.requester),para('호스팅사',d.host),para('업체명',d.company),para('제품명',d.product),para('상품 URL',d.productUrl),para('소재 키워드',d.keyword),para('매체',media),para('소재 전달 방식',s.assetMethod),para('소재 URL',s.assetUrl||''),para('캠페인 유형',s.campaignType),para('기존 캠페인 작업',s.campaigns||[]),para('예산',s.budget),para('금액',s.amount||''),para('타겟',s.target),para('수동 타겟 상세',s.targetDetail||''),para('지면',s.placements)];
 const p=await notion('/pages','POST',{parent:{database_id:db},properties:{[title]:{title:rich(d.company+' | '+d.product+' | '+media+' | '+d.keyword)}},children});
 created.push({id:p.id,url:p.url,media});
 const files=(req.files||[]).filter(f=>f.originalname.startsWith(media+'__'));
 for(const f of files){const filename=f.originalname.slice(media.length+2);const createdUpload=await notion('/file_uploads','POST',{mode:'single_part',filename,content_type:f.mimetype||'application/octet-stream'});const fd=new FormData();fd.append('file',new Blob([f.buffer],{type:f.mimetype||'application/octet-stream'}),filename);const up=await fetch('https://api.notion.com/v1/file_uploads/'+createdUpload.id+'/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Notion-Version':'2025-09-03'},body:fd});if(!up.ok)throw Error('Notion 파일 업로드 실패: '+(await up.text()));await notion('/blocks/'+p.id+'/children','PATCH',{children:[{object:'block',type:'file',file:{type:'file_upload',file_upload:{id:createdUpload.id}}}]});}
 }
 res.json({ok:true,created});
 }catch(e){res.status(400).json({error:e.message})}});
app.get('/api/requests',guard,async(req,res)=>{try{const d=await notion('/databases/'+db+'/query','POST',{page_size:100,sorts:[{timestamp:'created_time',direction:'descending'}]});res.json({rows:d.results.map(p=>({id:p.id,url:p.url,created:p.created_time,title:Object.values(p.properties).find(v=>v.type==='title')?.title?.map(v=>v.plain_text).join('')||'',status:Object.values(p.properties).find(v=>v.type==='status')?.status?.name||''}))})}catch(e){res.status(400).json({error:e.message})}});
app.listen(process.env.PORT||3000,()=>console.log('Ad request server ready'));
