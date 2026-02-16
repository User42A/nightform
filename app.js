// NightForm — offline workout planner (localStorage)
const KEY = "nightform.v1";

const elDayRow = document.getElementById("dayRow");
const elExerciseList = document.getElementById("exerciseList");
const elAddDay = document.getElementById("addDayBtn");
const elAddExercise = document.getElementById("addExerciseBtn");
const elCurrentDayName = document.getElementById("currentDayName");
const elCurrentDayKicker = document.getElementById("currentDayKicker");
const elProgress = document.getElementById("progressText");

// modal
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalInput = document.getElementById("modalInput");
const modalCancel = document.getElementById("modalCancel");
const modalOk = document.getElementById("modalOk");

let state = loadState();
let selectedDayId = state.selectedDayId || (state.days[0]?.id ?? null);

// ---- persistence
function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){
      const s = JSON.parse(raw);
      if(s && Array.isArray(s.days)) return s;
    }
  }catch(e){}
  // seed
  return {
    selectedDayId: null,
    days: [
      { id: uid(), name: "Day 1", exercises: [] },
      { id: uid(), name: "Day 2", exercises: [] },
      { id: uid(), name: "Day 3", exercises: [] },
    ]
  };
}
function save(){
  state.selectedDayId = selectedDayId;
  localStorage.setItem(KEY, JSON.stringify(state));
  render();
}
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

// ---- modal helper
let modalResolve = null;
function promptText(title, value){
  modalTitle.textContent = title;
  modalInput.value = value || "";
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  modalInput.focus();
  return new Promise(resolve=>{
    modalResolve = resolve;
  });
}
function closeModal(result){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  const r = modalResolve;
  modalResolve = null;
  if(r) r(result);
}
modalCancel.addEventListener("click", ()=>closeModal(null));
modalOk.addEventListener("click", ()=>closeModal(modalInput.value.trim() || null));
modal.addEventListener("click", (e)=>{ if(e.target === modal) closeModal(null); });
document.addEventListener("keydown", (e)=>{
  if(!modal.classList.contains("show")) return;
  if(e.key === "Escape") closeModal(null);
  if(e.key === "Enter") closeModal(modalInput.value.trim() || null);
});

// ---- actions
elAddDay.addEventListener("click", async ()=>{
  const name = await promptText("New day name", `Day ${state.days.length+1}`);
  if(!name) return;
  const d = { id: uid(), name, exercises: [] };
  state.days.push(d);
  selectedDayId = d.id;
  save();
});

elAddExercise.addEventListener("click", async ()=>{
  const day = getSelectedDay();
  if(!day) return;
  const name = await promptText("Exercise name", "Exercise");
  if(!name) return;
  day.exercises.push({
    id: uid(),
    name,
    done:false,
    weight:"",
    sets:"",
    reps:"",
    note:""
  });
  save();
});

function getSelectedDay(){
  return state.days.find(d => d.id === selectedDayId) || null;
}

function dayProgress(day){
  const total = day.exercises.length;
  const done = day.exercises.filter(x=>x.done).length;
  return {done,total};
}

// ---- render
function render(){
  // ensure selection
  if(!getSelectedDay()){
    selectedDayId = state.days[0]?.id ?? null;
  }

  // days
  elDayRow.innerHTML = "";
  state.days.forEach((d)=>{
    const {done,total} = dayProgress(d);
    const card = document.createElement("div");
    card.className = "dayCard" + (d.id === selectedDayId ? " active" : "");
    card.innerHTML = `
      <div class="dayTop">
        <div class="dots" title="Hold and drag (not implemented)">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="7" r="1.5"/><circle cx="16" cy="7" r="1.5"/>
            <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
            <circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/>
          </svg>
        </div>
        <button class="dayClose" title="Delete day" aria-label="Delete day">
          ×
        </button>
      </div>
      <div class="dayName">${escapeHtml(d.name)}</div>
      <div class="dayMeta">${done}/${total} done</div>
    `;

    card.addEventListener("click", (e)=>{
      // avoid click on delete
      if(e.target.closest(".dayClose")) return;
      selectedDayId = d.id;
      save();
    });

    card.querySelector(".dayClose").addEventListener("click", (e)=>{
      e.stopPropagation();
      if(state.days.length <= 1){
        alert("You need at least one day.");
        return;
      }
      const idx = state.days.findIndex(x=>x.id===d.id);
      state.days.splice(idx,1);
      if(selectedDayId === d.id){
        selectedDayId = state.days[Math.max(0, idx-1)]?.id ?? state.days[0].id;
      }
      save();
    });

    // rename on double click
    card.addEventListener("dblclick", async (e)=>{
      e.stopPropagation();
      const name = await promptText("Rename day", d.name);
      if(!name) return;
      d.name = name;
      save();
    });

    elDayRow.appendChild(card);
  });

  // exercises
  const day = getSelectedDay();
  if(!day){
    elCurrentDayKicker.textContent = "Day";
    elCurrentDayName.textContent = "Select a day";
    elProgress.textContent = "0/0 completed";
    elAddExercise.disabled = true;
    elExerciseList.innerHTML = "";
    return;
  }

  elAddExercise.disabled = false;
  elCurrentDayKicker.textContent = day.name.toUpperCase();
  elCurrentDayName.textContent = " ";
  const prog = dayProgress(day);
  elProgress.textContent = `${prog.done}/${prog.total} completed`;

  elExerciseList.innerHTML = "";
  day.exercises.forEach((ex, idx)=>{
    const card = document.createElement("div");
    card.className = "exerciseCard" + (ex.done ? " done" : "");
    card.innerHTML = `
      <div class="exerciseTop">
        <button class="check" aria-label="Toggle completed">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="exerciseTitle">${escapeHtml(ex.name)}</div>

        <div class="tools">
          <button class="toolBtn" data-act="rename" title="Rename" aria-label="Rename">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="toolBtn" data-act="up" title="Move up" aria-label="Move up">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5l6 6H6l6-6Z" fill="currentColor"/>
              <path d="M12 11v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="toolBtn" data-act="down" title="Move down" aria-label="Move down">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 19l-6-6h12l-6 6Z" fill="currentColor"/>
              <path d="M12 5v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="toolBtn danger" data-act="del" title="Delete" aria-label="Delete">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 6V4h8v2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="field">
          <label>Weight (kg)</label>
          <input inputmode="decimal" placeholder="0" value="${escapeAttr(ex.weight)}" data-field="weight"/>
        </div>
        <div class="field">
          <label>Sets</label>
          <input inputmode="numeric" placeholder="0" value="${escapeAttr(ex.sets)}" data-field="sets"/>
        </div>
        <div class="field">
          <label>Reps</label>
          <input inputmode="numeric" placeholder="0" value="${escapeAttr(ex.reps)}" data-field="reps"/>
        </div>
        <div class="field">
          <label>S (notes)</label>
          <input placeholder="..." value="${escapeAttr(ex.note)}" data-field="note"/>
        </div>
      </div>
    `;

    // toggle done
    card.querySelector(".check").addEventListener("click", ()=>{
      ex.done = !ex.done;
      save();
    });

    // tools
    card.querySelectorAll(".toolBtn").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const act = btn.dataset.act;
        if(act === "rename"){
          const name = await promptText("Rename exercise", ex.name);
          if(!name) return;
          ex.name = name;
          save();
        }
        if(act === "del"){
          day.exercises.splice(idx,1);
          save();
        }
        if(act === "up" && idx>0){
          const tmp = day.exercises[idx-1];
          day.exercises[idx-1]=day.exercises[idx];
          day.exercises[idx]=tmp;
          save();
        }
        if(act === "down" && idx<day.exercises.length-1){
          const tmp = day.exercises[idx+1];
          day.exercises[idx+1]=day.exercises[idx];
          day.exercises[idx]=tmp;
          save();
        }
      });
    });

    // inputs
    card.querySelectorAll("input[data-field]").forEach(inp=>{
      inp.addEventListener("input", ()=>{
        const f = inp.dataset.field;
        ex[f] = inp.value;
        // don't re-render each keystroke; just persist
        localStorage.setItem(KEY, JSON.stringify({...state, selectedDayId}));
      });
      inp.addEventListener("blur", ()=>save());
    });

    elExerciseList.appendChild(card);
  });

  // empty state
  if(day.exercises.length === 0){
    const empty = document.createElement("div");
    empty.style.color = "rgba(233,240,255,.55)";
    empty.style.fontSize = "13px";
    empty.style.padding = "6px 2px 0";
    empty.textContent = "No exercises yet. Add one below.";
    elExerciseList.appendChild(empty);
  }
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/\n/g," ");
}

render();
