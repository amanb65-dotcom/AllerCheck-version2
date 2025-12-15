document.addEventListener('DOMContentLoaded', () => {
    initNaranjo();
    initLiverpool();
    
    // Set Dates
    const today = new Date();
    const dateStr = today.toLocaleDateString('th-TH', {year:'numeric', month:'long', day:'numeric'});
    document.getElementById('printDate').innerText = dateStr;
    document.getElementById('cardDate').innerText = today.toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'});
});

// --- TIMELINE LOGIC ---
let timelineData = [];

function addTimelineItem() {
    const date = document.getElementById('tDate').value;
    const time = document.getElementById('tTime').value;
    const type = document.getElementById('tType').value;
    const desc = document.getElementById('tDesc').value;

    if (!date || !desc) { alert("กรุณาระบุวันที่และรายละเอียด"); return; }

    timelineData.push({
        id: Date.now(),
        date: date,
        time: time || "00:00",
        type: type,
        desc: desc,
        timestamp: new Date(`${date}T${time || "00:00"}`)
    });

    timelineData.sort((a, b) => a.timestamp - b.timestamp);
    document.getElementById('tDesc').value = ""; // Clear
    renderTimeline();
    updateCard(); // Update card if drug name added
}

function renderTimeline() {
    const container = document.getElementById('visualTimeline');
    container.innerHTML = '<div class="timeline-line"></div>';
    
    if (timelineData.length === 0) {
        container.innerHTML += '<div class="timeline-empty-state" style="text-align:center; padding:20px; color:#888;">ยังไม่มีข้อมูล</div>';
        return;
    }

    timelineData.forEach(item => {
        const div = document.createElement('div');
        div.className = `timeline-item ${item.type}`;
        const dateStr = new Date(item.date).toLocaleDateString('th-TH', {day:'numeric', month:'short'});
        
        div.innerHTML = `
            <button class="btn-del-time no-print" onclick="removeTimeline(${item.id})">x</button>
            <span class="time-badge">${dateStr} ${item.time} น.</span>
            <strong>${item.desc}</strong>
        `;
        container.appendChild(div);
    });
}

function removeTimeline(id) {
    timelineData = timelineData.filter(i => i.id !== id);
    renderTimeline();
    updateCard();
}

// --- ALGORITHMS (THAI LANGUAGE) ---

// 1. Naranjo (Thai)
const naranjoQ = [
    {q: "1. เคยมีรายงานสรุปเกี่ยวกับปฏิกิริยานี้มาก่อนหรือไม่?", y:1, n:0, u:0},
    {q: "2. อาการเกิดขึ้นหลังได้รับยาที่สงสัยหรือไม่?", y:2, n:-1, u:0},
    {q: "3. อาการดีขึ้นเมื่อหยุดยาหรือให้ยาต้านจำเพาะหรือไม่?", y:1, n:0, u:0},
    {q: "4. อาการกลับมาเป็นอีกเมื่อได้รับยาซ้ำหรือไม่?", y:2, n:-1, u:0},
    {q: "5. มีสาเหตุอื่นนอกจากยาที่สงสัยหรือไม่?", y:-1, n:2, u:0},
    {q: "6. เกิดอาการเมื่อได้รับยาหลอก (Placebo) หรือไม่?", y:-1, n:1, u:0},
    {q: "7. ตรวจพบระดับยาในเลือดสูงถึงระดับเป็นพิษหรือไม่?", y:1, n:0, u:0},
    {q: "8. อาการรุนแรงขึ้นเมื่อเพิ่มยา หรือลดลงเมื่อลดยาหรือไม่?", y:1, n:0, u:0},
    {q: "9. ผู้ป่วยเคยมีอาการคล้ายกันกับยาเดิมหรือยาที่คล้ายกันมาก่อนหรือไม่?", y:1, n:0, u:0},
    {q: "10. ยืนยันอาการด้วยหลักฐานเชิงประจักษ์หรือไม่?", y:1, n:0, u:0}
];

function initNaranjo() {
    const tbody = document.getElementById('naranjoList');
    naranjoQ.forEach((q, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${q.q}</td>
                <td class="center"><input type="radio" name="nq${i}" value="${q.y}" onchange="calcNaranjo()"></td>
                <td class="center"><input type="radio" name="nq${i}" value="${q.n}" onchange="calcNaranjo()"></td>
                <td class="center"><input type="radio" name="nq${i}" value="${q.u}" checked onchange="calcNaranjo()"></td>
            </tr>`;
    });
}

function calcNaranjo() {
    let score = 0;
    naranjoQ.forEach((_, i) => {
        document.getElementsByName(`nq${i}`).forEach(r => { if(r.checked) score += parseInt(r.value); });
    });
    
    document.getElementById('naranjoScore').innerText = score;
    let res = "Doubtful (สงสัย)";
    if(score>=9) res="Definite (ใช่แน่นอน)"; 
    else if(score>=5) res="Probable (น่าจะใช่)"; 
    else if(score>=1) res="Possible (อาจจะใช่)";
    
    document.getElementById('naranjoResult').innerText = res;
    updateCard(); // Update Result to Card
}

// 2. Liverpool (Thai)
const liverpoolQ = [
    "1. อาการทางคลินิก/ผลแล็บ สอดคล้องกับยาหรือไม่?",
    "2. ระยะเวลาการเกิดอาการสัมพันธ์กับการได้รับยาหรือไม่?",
    "3. อาการดีขึ้นเมื่อหยุดยาหรือไม่? (Dechallenge)",
    "4. อาการกลับมาเป็นซ้ำเมื่อได้รับยาใหม่หรือไม่? (Rechallenge)"
];

function initLiverpool() {
    const tbody = document.getElementById('liverpoolList');
    liverpoolQ.forEach((q, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${q}</td>
                <td width="100" class="center">
                    <select id="lq${i}" onchange="calcLiverpool()">
                        <option value="no">ไม่ใช่ (No)</option>
                        <option value="yes">ใช่ (Yes)</option>
                    </select>
                </td>
            </tr>`;
    });
}

function calcLiverpool() {
    const vals = [0,1,2,3].map(i => document.getElementById(`lq${i}`).value === 'yes');
    let res = "Unlikely (ไม่น่าใช่)";
    if (vals[0] && vals[1]) {
        if (vals[3]) res = "Definite (ใช่แน่นอน)";
        else if (vals[2]) res = "Probable (น่าจะใช่)";
        else res = "Possible (อาจจะใช่)";
    }
    document.getElementById('liverpoolResult').innerText = res;
}

// 3. Thai Algorithm
function calcThai() {
    const c = [1,2,3,4,5].map(i => document.getElementById(`thai${i}`).checked);
    let res = "Unlikely (ไม่น่าใช่)";
    if (c[0] && c[1] && c[2] && c[3]) res = "Certain (ใช่แน่นอน)";
    else if (c[0] && c[1] && c[3]) res = "Probable (น่าจะใช่)";
    else if (c[0] && c[4]) res = "Possible (อาจจะใช่)";
    document.getElementById('thaiResult').innerText = res;
}

// 4. SCORTEN
function calcScorten() {
    let score = 0;
    document.querySelectorAll('.sc-chk').forEach(c => { if(c.checked) score++; });
    document.getElementById('scScore').innerText = score;
    const risks = ["3.2%", "3.2%", "12.1%", "35.3%", "58.3%", ">90%", ">90%"];
    document.getElementById('scMortality').innerText = risks[score] || ">90%";
}

// --- CARD & PRINT LOGIC ---

function updateCard() {
    // ดึงข้อมูลมาแสดงที่บัตร
    const name = document.getElementById('patientName').value || "-";
    const reaction = document.getElementById('symptomDesc').value || "-";
    const naranjo = document.getElementById('naranjoResult').innerText.split(' ')[0]; // เอาแค่คำภาษาอังกฤษสั้นๆ
    const evaluator = document.getElementById('pharmaName').value || "-";
    const place = document.getElementById('pharmaPlace').value || "-";

    // หาชื่อยาจาก Timeline (เอาตัวที่เป็น Drug ล่าสุด หรือตัวแรก)
    const drugs = timelineData.filter(t => t.type === 'drug');
    const drugName = drugs.length > 0 ? drugs[drugs.length-1].desc : document.getElementById('tDesc').value || "ระบุชื่อยา...";

    document.getElementById('cardPatientName').innerText = name;
    document.getElementById('cardDrugName').innerText = drugName;
    document.getElementById('cardReaction').innerText = reaction.substring(0, 40) + (reaction.length>40?"...":"");
    document.getElementById('cardNaranjo').innerText = naranjo;
    document.getElementById('cardEvaluator').innerText = evaluator;
    document.getElementById('cardPlace').innerText = place;
}

function updateSign() {
    document.getElementById('printName').innerText = document.getElementById('pharmaName').value;
    document.getElementById('printPlace').innerText = document.getElementById('pharmaPlace').value;
}

function openTab(id) {
    document.querySelectorAll('.algo-content').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    event.target.classList.add('active');
}

function printReport() {
    document.body.classList.remove('printing-card');
    window.print();
}

function printCardOnly() {
    document.body.classList.add('printing-card');
    window.print();
    // หลังจากพิมพ์เสร็จ (ใน Chrome อาจจะไม่รู้ทันที แต่เรา remove class ออกทีหลังได้ถ้าต้องการ)
    // แต่เพื่อให้ปลอดภัย ให้ user กดรีเฟรชหรือเรา timeout ก็ได้ แต่ปล่อยไว้ให้เห็นว่าอยู่ในโหมด Card ก็โอเค
    setTimeout(() => { document.body.classList.remove('printing-card'); }, 2000); 
}

// API Check
async function checkDrugInfo() {
    const drug = document.getElementById('tDesc').value;
    const box = document.getElementById('apiResultBox');
    if(!drug) return alert("กรุณาพิมพ์ชื่อยาภาษาอังกฤษ");
    
    box.style.display = 'block'; box.innerText = "กำลังโหลด...";
    try {
        const res = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${drug}"&limit=1`);
        const data = await res.json();
        const info = data.results[0].adverse_reactions ? data.results[0].adverse_reactions[0] : "ไม่พบข้อมูลอาการข้างเคียง";
        box.innerHTML = `<strong>${drug}:</strong><br>${info.substring(0,300)}...`;
    } catch(e) { box.innerText = "ไม่พบข้อมูลยา (ลองใช้ชื่อ Generic Name ภาษาอังกฤษ)"; }
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('photoPreview').src = e.target.result;
            document.getElementById('photoPreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}