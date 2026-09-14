const {chromium}=require('C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('assert');
// Fonksiyon adları (f, g, h …) ve fonksiyonların birbirini çağırması: komut paneli + cebir girişi.
(async()=>{const b=await chromium.launch({headless:true,channel:'msedge'});try{
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:3005');await p.getByRole('button',{name:'Serbest Stüdyo',exact:true}).click();
await p.getByRole('button',{name:'Yazarak komut ver'}).click();
const input=p.getByRole('combobox',{name:'Çizim komutu',exact:true});
const scene=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('matematik_calisma_alani_v1')||'{"objects":[]}').objects);
const functions=async()=>(await scene()).filter(o=>o.type==='function').map(o=>o.label);
const say=async text=>{await input.fill(text);await input.press('Enter');await p.waitForFunction(()=>document.querySelector('[aria-label="Çizim komutu"]').value==='',null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(400);const status=(await p.locator('p[role="status"]').last().textContent().catch(()=>''))||'';console.log('KOMUT',JSON.stringify(text),'=>',status.trim().slice(0,160));return status;};

for(const t of['x kare fonksiyonu çiz','sin x grafiğini çiz','h(x) = f(x) + 1'])await say(t);
assert.deepEqual(await functions(),['f(x) = x^2','g(x) = sin(x)','h(x) = f(x) + 1']);
assert.equal((await scene()).filter(o=>o.type==='slider').length,0,'f çağrısı kaydırıcı üretmemeli');
assert.match(await say('f(3) kaç'),/f\(3\) = 9/);
await say('a = h(2)');
assert.equal((await scene()).find(o=>o.type==='slider'&&o.variableName==='a').value,5);
assert.match(await say('f(x) = f(x) + 1'),/kendisine bağlı olamaz/);

// Sol paneldeki cebir girişi
await p.getByTitle('Cebir Görünümü (Cebirsel İfadeler & Fonksiyonlar)').click();
const alg=p.getByPlaceholder('Örn: x^2 - 2,  a = 2,  y = sin(x)');
const enter=async text=>{await alg.fill(text);await alg.press('Enter');await p.waitForTimeout(400);};
await enter('x^3 - 2');await enter('q(x) = h(x) - 3');await enter('k = f(4)');
assert.deepEqual(await functions(),['f(x) = x^2','g(x) = sin(x)','h(x) = f(x) + 1','p(x) = x^3 - 2','q(x) = h(x) - 3']);
assert.equal((await scene()).find(o=>o.type==='slider'&&o.variableName==='k').value,16);
await enter('r(x) = w(x) + 1');assert((await p.getByText('w(x) tanımlı değil').count())>0,'tanımsız çağrı uyarısı görünmeli');
await enter('f(x) = x^2 - 4');
const labels=await functions();assert.equal(labels.length,5,'aynı adla ikinci f eklenmemeli');assert.equal(labels[0],'f(x) = x^2 - 4');
await p.screenshot({path:'artifacts/function-names.png'});
assert.deepEqual(errors,[]);
console.log('PASS benzersiz adlar (f, g, h, p, q), f(3) kaç, a = h(2), k = f(4), q(x) = h(x) - 3, döngü ve tanımsız çağrı uyarıları, f yeniden tanımlama');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
