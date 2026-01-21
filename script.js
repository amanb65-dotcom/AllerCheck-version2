document.addEventListener('DOMContentLoaded', () => {
    initNaranjo();
    initLiverpool();
    renderThaiList(); 
    syncData(); 
});

// --- SYNC DATA ---
function syncData() {
    document.getElementById('pNameDisplay').innerText = document.getElementById('patientName').value || "....................................";
    document.getElementById('pHNDisplay').innerText = document.getElementById('patientHN').value || "..................";
    document.getElementById('pAgeDisplay').innerText = document.getElementById('patientAge').value || "....";
    document.getElementById('pWardDisplay').innerText = document.getElementById('patientWard').value || "..................";
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'});
    document.getElementById('pDateDisplay').innerText = dateStr;
    document.getElementById('printDate').innerText = dateStr;
    document.getElementById('cardDateDisplay').innerText = today.toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'});

    document.getElementById('printName').innerText = document.getElementById('pharmaName').value || "........................................";
    updateCard();
}

// --- OPENFDA SMART SEARCH LOGIC ---
let searchTimeout = null;

function togglePlaceholder() {
    const type = document.getElementById('tType').value;
    const descInput = document.getElementById('tDesc');
    const suggestions = document.getElementById('drugSuggestions');
    
    if(type === 'drug') {
        descInput.placeholder = "พิมพ์ชื่อยาภาษาอังกฤษ (เช่น Amoxi)...";
    } else {
        descInput.placeholder = "ระบุอาการ...";
        suggestions.style.display = 'none'; // Hide if symptom
    }
}

function handleInputSearch() {
    const type = document.getElementById('tType').value;
    const query = document.getElementById('tDesc').value;
    const suggestions = document.getElementById('drugSuggestions');

    // Sync card anyway
    syncData();

    // Only search if type is Drug and length > 2
    if(type !== 'drug' || query.length < 3) {
        suggestions.style.display = 'none';
        return;
    }

    // Debounce: Wait 500ms after typing stops
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchDrugFromFDA(query);
    }, 500);
}

async function fetchDrugFromFDA(query) {
    const suggestions = document.getElementById('drugSuggestions');
    try {
        // Search openfda.brand_name with wildcard *
        const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${query}*"&limit=5`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            suggestions.innerHTML = '';
            
            // Extract unique brand names using Set
            const uniqueNames = new Set();
            
            data.results.forEach(item => {
                if(item.openfda && item.openfda.brand_name) {
                    item.openfda.brand_name.forEach(name => uniqueNames.add(name));
                }
            });

            if(uniqueNames.size === 0) { suggestions.style.display = 'none'; return; }

            // Render List
            uniqueNames.forEach(name => {
                const li = document.createElement('li');
                li.innerText = name;
                li.onclick = () => {
                    document.getElementById('tDesc').value = name;
                    suggestions.style.display = 'none';
                    syncData();
                };
                suggestions.appendChild(li);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    } catch (err) {
        // console.error(err);
        suggestions.style.display = 'none';
    }
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    const suggestions = document.getElementById('drugSuggestions');
    if(e.target.id !== 'tDesc') {
        suggestions.style.display = 'none';
    }
});


// --- TIMELINE LOGIC ---
let timelineData = [];

function addTimelineItem() {
    const startDate = document.getElementById('tStartDate').value;
    const startTime = document.getElementById('tStartTime').value;
    const stopDate = document.getElementById('tStopDate').value;
    const stopTime = document.getElementById('tStopTime').value;
    const type = document.getElementById('tType').value;
    const desc = document.getElementById('tDesc').value;

    if (!desc) { alert("กรุณาระบุ 'รายละเอียด'"); return; }

    timelineData.push({
        id: Date.now(),
        start: { date: startDate, time: startTime },
        stop: { date: stopDate, time: stopTime },
        type: type,
        desc: desc,
        sortTime: startDate ? new Date(`${startDate}T${startTime||"00:00"}`) : new Date(0)
    });
    
    timelineData.sort((a, b) => a.sortTime - b.sortTime);
    document.getElementById('tDesc').value = ""; 
    document.getElementById('drugSuggestions').style.display = 'none';
    renderTimeline();
    updateCard();
}

function formatDate(d, t) {
    if(!d) return "";
    const dateObj = new Date(d);
    const dateStr = dateObj.toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'});
    const timeStr = t ? ` ${t}` : "";
    return `${dateStr}${timeStr}`;
}

function renderTimeline() {
    const container = document.getElementById('visualTimeline');
    container.innerHTML = '<div class="timeline-line"></div>'; 
    
    if(timelineData.length === 0) {
        container.innerHTML += '<div class="timeline-empty-state" style="text-align:center; padding:10px; color:#aaa;">(ไม่มีข้อมูล)</div>'; return;
    }

    timelineData.forEach(item => {
        const div = document.createElement('div');
        div.className = `timeline-item ${item.type}`;
        
        const startStr = formatDate(item.start.date, item.start.time);
        const stopStr = formatDate(item.stop.date, item.stop.time);
        let dateDisplay = startStr || "(ไม่ระบุวัน)";
        if(stopStr) { dateDisplay += ` - ${stopStr}`; }

        div.innerHTML = `
            <button class="btn-del-time no-print" onclick="removeTimeline(${item.id})">×</button>
            <span class="time-badge">${dateDisplay}</span>
            <span class="timeline-desc">${item.desc}</span>
        `;
        container.appendChild(div);
    });
}

function removeTimeline(id) { timelineData = timelineData.filter(i => i.id !== id); renderTimeline(); updateCard(); }

// --- ALGORITHMS ---
const naranjoQ = [
    {q:"1.รายงานสรุปปฏิกิริยานี้?", y:1, n:0, u:0},
    {q:"2.เกิดหลังได้ยา?", y:2, n:-1, u:0},
    {q:"3.ดีขึ้นเมื่อหยุดยา?", y:1, n:0, u:0},
    {q:"4.เป็นซ้ำเมื่อรับยาใหม่?", y:2, n:-1, u:0},
    {q:"5.มีสาเหตุอื่น?", y:-1, n:2, u:0},
    {q:"6.เป็นเมื่อได้ยาหลอก?", y:-1, n:1, u:0},
    {q:"7.ระดับยาเป็นพิษ?", y:1, n:0, u:0},
    {q:"8.รุนแรงขึ้นเมื่อเพิ่มยา?", y:1, n:0, u:0},
    {q:"9.เคยมีอาการคล้ายกัน?", y:1, n:0, u:0},
    {q:"10.หลักฐานเชิงประจักษ์?", y:1, n:0, u:0}
];

function initNaranjo() {
    const b = document.getElementById('naranjoList');
    naranjoQ.forEach((q,i) => {
        b.innerHTML += `<tr><td>${q.q}</td>
        <td class="center"><input type="radio" name="nq${i}" value="${q.y}" onchange="calcNa()"></td>
        <td class="center"><input type="radio" name="nq${i}" value="${q.n}" onchange="calcNa()"></td>
        <td class="center"><input type="radio" name="nq${i}" value="${q.u}" checked onchange="calcNa()"></td></tr>`;
    });
}
function calcNa() {
    let s=0; naranjoQ.forEach((_,i)=>document.getElementsByName(`nq${i}`).forEach(r=>{if(r.checked)s+=parseInt(r.value)}));
    document.getElementById('naranjoScore').innerText = s;
    let r="Doubtful"; if(s>=9)r="Definite"; else if(s>=5)r="Probable"; else if(s>=1)r="Possible";
    document.getElementById('naranjoResult').innerText = r;
    updateCard();
}

function initLiverpool() {
    const q=["1. อาการ/Lab เข้ากันได้?", "2. เวลาสัมพันธ์กับยา?", "3. หยุดยาแล้วดีขึ้น?", "4. ให้ยาซ้ำแล้วเป็นอีก?"];
    const b = document.getElementById('liverpoolList');
    q.forEach((t,i)=> b.innerHTML+=`<tr><td>${t}</td><td class="center"><select id="lq${i}" onchange="calcLi()"><option value="no">No</option><option value="yes">Yes</option></select></td></tr>`);
}
function calcLi() {
    const v=[0,1,2,3].map(i=>document.getElementById(`lq${i}`).value==='yes');
    let r="Unlikely"; if(v[0]&&v[1]){ if(v[3])r="Definite"; else if(v[2])r="Probable"; else r="Possible"; }
    document.getElementById('liverpoolResult').innerText = r;
}

function renderThaiList() {
    const list = document.getElementById('thaiList');
    const items = ["1. สัมพันธ์กับเวลา", "2. หยุดยาแล้วหาย", "3. ให้ยาซ้ำแล้วเป็น", "4. ไม่มีสาเหตุอื่น", "5. เภสัชวิทยาเป็นไปได้"];
    items.forEach((txt, i) => {
        list.innerHTML += `<div style="margin-bottom:5px;"><label><input type="checkbox" id="thai${i}" onchange="calcThai()"> ${txt}</label></div>`;
    });
}
function calcThai() {
    const c=[0,1,2,3,4].map(i=>document.getElementById(`thai${i}`).checked);
    let r="Unlikely"; if(c[0]&&c[1]&&c[2]&&c[3])r="Certain"; else if(c[0]&&c[1]&&c[3])r="Probable"; else if(c[0]&&c[4])r="Possible";
    document.getElementById('thaiResult').innerText = r;
}

function calcScorten() {
    let s=0; document.querySelectorAll('.sc-chk').forEach(c=>{if(c.checked)s++});
    document.getElementById('scScore').innerText = s;
    const m=["3.2%","3.2%","12.1%","35.3%","58.3%",">90%"];
    document.getElementById('scMortality').innerText = m[s]||">90%";
}

// --- CARD & UTILS ---
function updateCard() {
    document.getElementById('cardPatientName').innerText = document.getElementById('patientName').value || "-";
    const drugs = timelineData.filter(t=>t.type==='drug');
    const dName = drugs.length>0 ? drugs[drugs.length-1].desc : document.getElementById('tDesc').value || "-";
    document.getElementById('cardDrugName').innerText = dName;
    document.getElementById('cardReaction').innerText = (document.getElementById('symptomDesc').value||"-").substring(0,25);
    
    // Diagnosis in Card
    const dx = document.getElementById('diagnosisType').value;
    document.getElementById('cardDiagnosis').innerText = dx || "-";

    document.getElementById('cardEvaluator').innerText = document.getElementById('pharmaName').value || "-";
}

function openTab(id) {
    document.querySelectorAll('.algo-content').forEach(d=>d.style.display='none');
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(id).style.display='block';
    event.target.classList.add('active');
}

function printReport() {
    document.body.classList.remove('printing-card');
    window.print();
}
function printCardOnly() {
    document.body.classList.add('printing-card');
    window.print();
    setTimeout(()=>{document.body.classList.remove('printing-card')}, 1000);
}

function previewImage(event) {
    const file = event.target.files[0];
    if(file){
        const r=new FileReader();
        r.onload=e=>{document.getElementById('photoPreview').src=e.target.result; document.getElementById('photoPreviewContainer').style.display='block';}
        r.readAsDataURL(file);
    }
}
