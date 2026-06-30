let app;
const API =
  "https://script.google.com/macros/s/AKfycbzlNbDOti6lWS2mPlUdwrYjWFQbGhFLKMyrJ9rhGMbsIkuYEIeXUwQfPOc_FT908hPj/exec";

let studentId = "";
let currentTest = "";
let answers = {};
let timer;
let globalQuestions = [];
let dailyCountdownTimer = null;
let reviewQuestions = new Set();
let visitedQuestions = new Set();
let currentQuestionIndex = 0;
let previousPage = null;
let countdownTimer = null;
let testStartTime = 0;
let wakeLock = null;


function enableTestMode(){
  document.body.classList.add("test-mode");
}

function disableTestMode(){
  document.body.classList.remove("test-mode");
}

async function enterFullscreen(){

  const el = document.documentElement;

  if(el.requestFullscreen){
    await el.requestFullscreen();
  }
}

window.addEventListener(
  "DOMContentLoaded",
  () => {

    app =
      document.getElementById("app");

    const saved =
      localStorage.getItem(
        "studentData"
      );

    if(saved){

      const user =
        JSON.parse(saved);

      studentId =
        user.studentId;

      window.studentName =
        user.name;

      window.studentClass =
        user.class;

      window.studentMobile =
        user.mobile;

      loadTests();

    }else{

      showLogin();

    }

  }
);


function pushState(){
  history.pushState({page: "app"}, "", "");
}

window.onpopstate = () => loadTests();

function showNavButtons(){

  const nav = document.getElementById("navBtns");

  nav.innerHTML = `

    <button
      class="nav-icon-btn"
      id="profileBtn">

      👤

    </button>

    <button
      class="nav-logout-btn"
      id="logoutBtn">

      Logout

    </button>

  `;

  document.getElementById(
    "profileBtn"
  ).onclick = showProfile;

  document.getElementById(
    "logoutBtn"
  ).onclick = logout;

}

function hideNavButtons(){
  const nav = document.getElementById("navBtns");
  if(nav) nav.innerHTML = "";
}


function logout(){

  localStorage.removeItem(
    "studentData"
  );

  studentId = "";

  currentTest = "";

  answers = {};

  clearInterval(timer);
  disableWakeLock();
  showLogin();
document
.getElementById("examWatermark")
?.remove();
}

function showLogin(){
  hideNavButtons();
  app.innerHTML = `
  <div class="login-card">
   <div class="logo">
   <img src="https://drive.google.com/thumbnail?id=1dv8ilpts0Q0Kw01TLZnD83bodvSInSZY&sz=w1000" class="login-logo">
  </div>
    <div class="title">Welcome Back</div>
    <div class="subtitle">Login to continue</div>

    <div class="input-box">
      📱 <input id="m" placeholder="Mobile / Student ID">
    </div>

    <div class="input-box">
      🔒 <input id="p" type="password" placeholder="Password">
    </div>

    <button class="btn" onclick="login()">Login</button>
     <div id="loginStatus" class="status-box default">
      Enter your credentials to login
    </div>

</div>
  </div>`;
}

function login(){
  const id = document.getElementById("m").value.trim();
  const pass = document.getElementById("p").value.trim();
  const btn = document.querySelector(".btn");

  if(!id || !pass){
    setStatus("⚠️ Enter credentials", "error");
    return;
  }

  setStatus("⏳ Loading dashboard...", "loading");
  btn.disabled = true;
  btn.innerText = "Please wait...";

  fetch(API + "?action=login&mobile=" + id + "&password=" + pass)
    .then(res => res.json())
    .then(data => {

      if(data.status === "success"){

  studentId = data.studentId;

window.studentName = data.name;

window.studentClass = data.class;

window.studentMobile = data.mobile;
localStorage.setItem(
  "studentData",
  JSON.stringify({
    studentId:data.studentId,
    name:data.name,
    class:data.class,
    mobile:data.mobile
  })
);

  setStatus("✅ Login successful", "success");

  setTimeout(()=>{
    loadTests();
  },1000);



      } else if(data.status === "wrong_password"){
        setStatus("❌ Incorrect Password", "error");

      } else if(data.status === "user_not_found"){
        setStatus("❌ User not found", "error");

      } else {
        setStatus("⚠️ Unexpected error", "error");
      }

    })
    .catch(()=>{
      setStatus("🚫 Server error. Try again later", "error");
    })
    .finally(()=>{
      btn.disabled = false;
      btn.innerText = "Login";
    });
}

function setStatus(message, type){
  const box = document.getElementById("loginStatus");
  if(!box) return;
  box.className = "status-box " + type;
  box.innerText = message;
}
function getStudentAvatar(name){

  const avatars = [
    "🧑‍🎓",
    "👨‍💻",
    "👩‍💻",
    "🧑‍🚀",
    "👨‍🔬",
    "👩‍🔬",
    "🧑‍🏫",
    "👨‍🎨",
    "👩‍🎨",
    "🦁",
    "🦅",
    "🐯",
    "🐼",
    "🐨",
    "🐻",
    "🦊",
    "🐺",
    "🐲",
    "⚡",
    "🔥"
  ];

  let sum = 0;

  for(let i=0;i<name.length;i++){
    sum += name.charCodeAt(i);
  }

  return avatars[
    sum % avatars.length
  ];

}

function loadTests(){
console.log("API =", API);
console.log("Dashboard URL =", `${API}?action=dashboard&studentId=${studentId}`);
  pushState();

  showNavButtons();
  app.innerHTML = `
<div class="dashboard-loader">

  <div class="loader-logo">
      🎓
  </div>

  <h2>Preparing Your Dashboard</h2>

  <p>Please wait a moment...</p>

  <div class="loader-bar">
      <div class="loader-progress"></div>
  </div>

  <div class="loader-skeleton">

      <div class="sk-card large"></div>

      <div class="sk-card"></div>

      <div class="sk-card"></div>

      <div class="sk-card"></div>

  </div>

</div>
`;

fetch(`${API}?action=dashboard&studentId=${studentId}`)

.then(response => response.text())

.then(txt => {
  console.log("RAW RESPONSE =", txt);

  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    console.error("JSON ERROR:", txt);

    app.innerHTML = `
      <div class="card">
        ❌ Server Error / Invalid Response
      </div>
    `;
    return;
  }

  console.log("DATA =", data);

  console.log("TESTS =", data.tests);

  console.log("ATTEMPTED =", data.attempted);

  console.log("UPCOMING =", data.upcoming);

  const tests = data.tests;
  window.liveTests = tests;
  window.liveTest =
tests.length
? tests[0]
: null;
  const attempted = data.attempted;

  const upcomingTests = data.upcoming || [];
  const filteredUpcomingTests = upcomingTests.filter(test => {

  if (!window.liveTest) return true;

  return test.testId !== window.liveTest.testId;

});

 let totalVisibleTests = 0;
  let html = `

<!-- PREMIUM HERO V3 -->

<div class="hero-v3">

  <div class="hero-bg-glow"></div>

  <div class="hero-top">

    <div class="hero-user">

      <div class="hero-greeting">
        👋 Welcome Back
      </div>

      <div class="hero-name">
        ${window.studentName}
      </div>

      <div class="hero-class">
        🎓 Class ${window.studentClass}
      </div>

    </div>

    <div class="hero-avatar">
      ${getStudentAvatar(window.studentName)}
    </div>

  </div>

  <div class="hero-stats">

    <div class="hero-stat">
      <span>🔥</span>

      <div>
        <h3>${data.streak || 0}</h3>
        <p>Current Streak</p>
      </div>
    </div>

    <div class="hero-stat">
      <span>📝</span>

      <div>
        <h3>${data.totalTests || 0}</h3>
        <p>Tests Attempted</p>
      </div>
    </div>

    <div class="hero-stat">
      <span>🎯</span>

      <div>
        <h3>${data.avgScore || 0}%</h3>
        <p>Average Score</p>
      </div>
    </div>

    <div class="hero-stat">
      <span>🏅</span>

      <div>
        <h3>#${data.rank || "--"}</h3>
        <p>Current Rank</p>
      </div>
    </div>

  </div>

</div>
${data.todayMission ? `

<div class="mission-card">

  <div class="mission-header">

    <div>

      <div class="mission-label">
        📅 TODAY'S MISSION
      </div>

      <h3>
        Your Learning Plan
      </h3>

    </div>

    <div class="mission-badge">
      ${data.todayMission.subject}
    </div>

  </div>

  <div class="mission-list">

    <a
      href="${data.todayMission.link}"
      target="_blank"
      class="mission-item">

      <div class="mission-icon">
        📚
      </div>

      <div class="mission-content">

        <small>Study Material</small>

        <strong>
          ${data.todayMission.topic}
        </strong>

      </div>

      <div class="mission-arrow">
        →
      </div>

    </a>

    <div class="mission-item">

      <div class="mission-icon">
        ⏳
      </div>

      <div class="mission-content">

        <small>Practice</small>

        <strong>
          ${data.todayMission.practice}
        </strong>

      </div>

    </div>

    <div class="mission-item">

      <div class="mission-icon">
        📝
      </div>

      <div class="mission-content">

        <small>Test Of The Day</small>

        <strong>
          ${data.todayMission.test}
        </strong>

      </div>

    </div>

  </div>

</div>

` : ""}

`;

/* =========================
   LIVE TESTS
========================= */
if(tests.length===0){

html+=`

<div
style="
margin-bottom:22px;
">

</div>

`;

}

for(let i=0;i<tests.length;i++){

  const t = tests[i];

  if(
    String(t.class) === String(window.studentClass) ||
    String(t.class).toUpperCase() === "ALL"
  ){

    totalVisibleTests++;

    const isDone =
      attempted &&
      attempted[t.testId];

html += `

<div class="today-test-card live-version">

<div class="today-test-top">

<div>

<div class="today-test-label">
🔥 LIVE TEST
</div>

<div class="today-test-title">
${t.testName}
</div>

</div>

<div class="today-test-status live">
 ACTIVE
</div>

</div>

<div class="today-test-divider"></div>

<div class="today-countdown">

${t.testId}

</div>

<div class="today-message">

Test Ends Today @ 9:00 PM

</div>

<div class="today-progress">

<div
class="today-progress-fill"
style="width:100%">
</div>

</div>

${
isDone
?

`
<div
class="today-action completed"

onclick="openAnalysis('${t.testId}')">

📊 View Analysis

</div>
`

:

`

<div
class="today-action live"

onclick="showInstructions('${t.testId}',${t.duration})">

🚀 Start Today's Test

</div>

`

}

</div>

`;

  }
}
if(filteredUpcomingTests.length){

  html += `

    <div style="
      margin-top:18px;
      margin-bottom:10px;
    ">

      <div style="
        font-size:24px;
        font-weight:900;
        color:#ffffff;
       letter-spacing:-0.5px;
      ">
        📅 Upcoming Tests
      </div>

      <div style="
        margin-top:4px;
        color:#94A3B8;
        font-size:14px;
      ">
        Next 5 Tests schedule
      </div>

    </div>

  `;
}

html += `

${filteredUpcomingTests.map(upcoming => {

  const now = new Date();

  const release =
    new Date(upcoming.release);

  const today =
   new Date();

const isToday =
today.toDateString() ===
release.toDateString();

const tomorrow =
new Date(today);

tomorrow.setDate(
today.getDate()+1
);

const isTomorrow =
tomorrow.toDateString() ===
release.toDateString();

  const endTime =
    new Date(release);

  endTime.setHours(
    21,0,0,0
  );

  const submitted =
    attempted &&
    attempted[upcoming.testId];

  let buttonHtml = "";
  let availabilityText =
"";

if(isToday){

availabilityText =
"⏰ Starts Today at 9:00 AM";

}

else if(isTomorrow){

availabilityText =
"📅 Starts Tomorrow at 9:00 AM";

}

else{

availabilityText =
"📅 Starts on " +

release.toLocaleDateString(
"en-IN",
{
day:"2-digit",
month:"short"
}
);

}

if(submitted){

  buttonHtml = `
    <div style="
      display:flex;
      gap:10px;
      margin-top:14px;
    ">

      <div
        class="unlock-banner"
        style="
          flex:1;
          margin:0;
        ">
        ✅ Completed
      </div>

      <button
        class="analysis-btn"
        style="
          flex:1;
          width:auto;
        "
        onclick="openAnalysis('${upcoming.testId}')">

        📊 Analysis

      </button>

    </div>
  `;

  }else if(
    now >= release &&
    now < endTime
  ){

    buttonHtml = `
      <div
        class="unlock-banner"
        style="cursor:pointer"
        onclick="showInstructions('${upcoming.testId}',30)"
      >
        🚀 Start Test
      </div>
    `;

  }else{

    buttonHtml = `
<div
id="upcomingCountdown-${upcoming.testId}"
class="unlock-banner"
data-test-id="${upcoming.testId}">

${availabilityText}

<br>

<span
style="
font-size:13px;
opacity:.8;
">

Countdown Loading...

</span>

</div>

</div>
    `;

  }

  return `

<div class="premium-upcoming-card upcoming-test-card">


<div class="premium-upcoming-top">

  <div>

    <div class="premium-label">
      ${
        upcoming.isLive
          ? "🔥 LIVE TEST"
          : "🚀 UPCOMING TEST"
      }
    </div>

    <div class="premium-test-title">
      ${upcoming.testName || ""}
    </div>

  </div>

  ${(() => {

    const now = new Date();

const release = new Date(upcoming.release);

const endTime = new Date(release);

endTime.setHours(21, 0, 0, 0);

const isLive =
  now >= release &&
  now < endTime;
   let statusText =
"🔒 LOCKED";

if(isLive){

statusText =
"🔴 LIVE";

}
return `
<div class="premium-live-badge ${isLive ? 'live' : 'locked'}">

    ${
      isLive
      ? `
      <div class="live-content">
          <span class="live-dot"></span>
          <span class="live-text">LIVE</span>
      </div>
      `
      : `
      <div class="locked-content">

          <span class="lock-icon">🔒</span>

          <span class="lock-text">
              Locked
          </span>

      </div>
      `
    }

</div>
`;

  })()}

</div>


<div class="premium-divider"></div>

  <div class="premium-info-grid">

    <div class="info-box">
      <div class="info-icon">📅</div>
      <div>
        <div class="info-label">Date</div>
        <div class="info-value">
          ${new Date(
            upcoming.release
          ).toLocaleDateString(
            "en-IN",
            {
              day:"2-digit",
              month:"short",
              year:"numeric"
            }
          )}
        </div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-icon">⏰</div>
      <div>
        <div class="info-label">Time</div>
        <div class="info-value">
         ${upcoming.time}
        </div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-icon">📖</div>
      <div>
        <div class="info-label">Questions</div>
        <div class="info-value">
          ${upcoming.questions} MCQs
        </div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-icon">⏳</div>
      <div>
        <div class="info-label">Duration</div>
        <div class="info-value">
         ${upcoming.duration} Min
        </div>
      </div>
    </div>

  </div>
<div class="upcoming-syllabus-box">

  <div class="upcoming-syllabus-title">
    📚 Syllabus
  </div>

  <div class="upcoming-syllabus-text">
    ${upcoming.syllabus}
  </div>

</div>
  ${buttonHtml}

</div> <!-- premium-upcoming-card -->

`;

}).join("")}

`;

console.log("LIVE TESTS =", tests);
console.log("CLASS =", window.studentClass);
console.log("HTML LENGTH =", html.length);
html += `

<div class="exam-countdown-section">

  <div class="section-heading">
    ⏳ Upcoming Exams
  </div>

  <div class="exam-countdown-grid">

    <div class="exam-widget">

      <div class="exam-title">
        ⏳ JNVST Exam
      </div>

      <div
        class="exam-days"
        id="jnvstCountdown">

        Loading...

      </div>

    </div>

    <div class="exam-widget">

      <div class="exam-title">
        🏅 Olympiad Exam
      </div>

      <div
        class="exam-days"
        id="olympiadCountdown">

        Loading...

      </div>

    </div>

  </div>

</div>

`;
if(tests.length){

const liveName =
tests[0].testName || "Today's Test";

html = html.replace(

"General Studies",

liveName

);

}

app.innerHTML = html;
updateExamCountdowns();
if(filteredUpcomingTests.length){

upcomingTests.forEach(t=>{
  startCountdown(t.release, t.testId);
});

}

  });
}

function formatUpcomingTime(value){

value=String(value).trim();

switch(value){

case "900":
return "09:00 AM";

case "930":
return "09:30 AM";

case "1000":
case "100":
return "10:00 AM";

case "1030":
return "10:30 AM";

case "1100":
return "11:00 AM";

case "1130":
return "11:30 AM";

case "1200":
return "12:00 PM";

case "1230":
return "12:30 PM";

case "1300":
return "01:00 PM";

case "1330":
return "01:30 PM";

case "1400":
return "02:00 PM";

case "1430":
return "02:30 PM";

case "1500":
return "03:00 PM";

default:
return value;

}

}

function showInstructions(id, dur){

  pushState();
  hideNavButtons();

  currentTest = id;

  app.innerHTML = `
    <div class="container">
      <div class="card" style="
        text-align:center;
        padding:30px;
      ">
        <div style="
          font-size:40px;
          margin-bottom:10px;
        ">
          ⏳
        </div>

        <div style="
          font-size:18px;
          font-weight:700;
        ">
          Loading Instructions...
        </div>
      </div>
    </div>
  `;

  fetch(`${API}?action=questions&testId=${encodeURIComponent(id)}`)

    .then(response => {

      if(!response.ok){
        throw new Error(`HTTP ${response.status}`);
      }

      return response.text();

    })

    .then(txt => {

      console.log("RAW QUESTIONS RESPONSE =", txt);

      let data;

      try {

        data = JSON.parse(txt);

      } catch(e) {

        console.error("QUESTIONS JSON ERROR =", txt);

        app.innerHTML = `
          <div class="container">
            <div class="card" style="
              text-align:center;
              padding:25px;
            ">
              <h2>❌ Invalid Server Response</h2>

              <button
                class="btn"
                onclick="loadTests()">

                Back To Dashboard

              </button>
            </div>
          </div>
        `;

        return;
      }

      console.log("FULL API RESPONSE =", data);

      globalQuestions = Array.isArray(data.questions)
        ? data.questions
        : JSON.parse(data.questions || "[]");

      console.log("Clicked Test ID:", id);
      console.log("Questions Count:", globalQuestions.length);
      console.log("First Question:", globalQuestions[0]);

      if(!globalQuestions.length){

        app.innerHTML = `
          <div class="container">

            <div class="card" style="
              text-align:center;
              padding:25px;
            ">

              <h2>⚠️ Test Not Available</h2>

              <p>
                Questions could not be loaded.
              </p>

              <button
                class="btn"
                onclick="loadTests()">

                Back To Dashboard

              </button>

            </div>

          </div>
        `;

        return;
      }

      app.innerHTML = `

        <div class="container">

          <div class="card" style="
            border-radius:24px;
            padding:24px;
          ">

            <h2 style="
              margin-top:0;
              color:#ffffff;
              font-weight:900;
            ">
              📋 Important Instructions
            </h2>

            <div class="modern-instructions">

              <div class="exam-guidelines">

                <ul>
                  <li>Read every question carefully before answering.</li>

                  <li>You can change answers anytime before final submission.</li>

                  <li>Do not refresh or close the browser during the test.</li>

                  <li>Timer will continue running even if internet fluctuates.</li>

                  <li>Unattempted questions carry 0 marks.</li>

                  <li>Test will automatically submit when time expires.</li>

                  <li>Ensure stable internet connection before starting.</li>

                  <li>Your progress is automatically saved.</li>

                </ul>

              </div>

              <div class="candidate-box">

                <div>
                  🆔 Test ID : <b>${id}</b>
                </div>

                <div>
                  📅 Date : <b>${new Date().toLocaleDateString()}</b>
                </div>

              </div>

              <div style="
                background:#eef7ff;
                padding:16px;
                border-radius:14px;
                margin-bottom:18px;
                line-height:1.9;
              ">

                <div>
                  📚 Total Questions:
                  <b>${globalQuestions.length}</b>
                </div>

                <div>
                  ⏳ Duration:
                  <b>${dur} Minutes</b>
                </div>

                <div>
                  ✅ Correct Answer:
                  <b>+2 Marks</b>
                </div>

                <div>
                  ❌ Wrong Answer:
                  <b>-0.5 Marks</b>
                </div>

                <div>
                  ⚪ Unattempted:
                  <b>0 Mark</b>
                </div>

                <div>
                  🎯 Attempt all questions carefully.
                </div>

              </div>

              <button
                class="btn"
                onclick="startTest(${dur})">

                🚀 Start Test

              </button>

            </div>

          </div>

        </div>

      `;

    })

    .catch(error => {

      console.error("SHOW INSTRUCTIONS ERROR =", error);

      app.innerHTML = `

        <div class="container">

          <div class="card" style="
            text-align:center;
            padding:25px;
          ">

            <h2>🚫 Failed To Load Test</h2>

            <p>
              Unable to fetch instructions or questions.
            </p>

            <button
              class="btn"
              onclick="loadTests()">

              Back To Dashboard

            </button>

          </div>

        </div>

      `;

    });

}
 
 function escapeHtml(text) {
  if (text == null) return "";

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
/* ==========================
   SCREEN WAKE LOCK
========================== */

async function enableWakeLock(){

  try{

    if("wakeLock" in navigator){

      wakeLock =
        await navigator.wakeLock.request("screen");

      console.log("Wake Lock Enabled");

      wakeLock.addEventListener(
        "release",
        ()=>{
          console.log("Wake Lock Released");
        }
      );

    }

  }catch(err){

    console.log(
      "Wake Lock Error:",
      err.message
    );

  }

}

async function disableWakeLock(){

  try{

    if(wakeLock){

      await wakeLock.release();

      wakeLock = null;

      console.log("Wake Lock Disabled");

    }

  }catch(e){}

}

/* Screen visible hone par dobara enable */

document.addEventListener(

  "visibilitychange",

  async ()=>{

    if(
      wakeLock === null &&
      document.visibilityState==="visible"
    ){

      enableWakeLock();

    }

  }

);
function createWatermark(){

const old =
document.getElementById("examWatermark");

if(old) old.remove();

const layer =
document.createElement("div");

layer.id="examWatermark";

layer.className="exam-watermark";

const text =

`MAHADEV ACADEMY
 | ${window.studentName}
 | ${studentId}
 | ${window.studentMobile}`;

for(let y=0;y<window.innerHeight+400;y+=170){

for(let x=-150;x<window.innerWidth+300;x+=260){

const item =
document.createElement("span");

item.style.left=x+"px";

item.style.top=y+"px";

item.innerText=text;

layer.appendChild(item);

}

}

document.body.appendChild(layer);

}
function startTest(dur){

  pushState();
  hideNavButtons();
  answers = {};
  enableWakeLock();
  createWatermark();

  let html = `

  <div class="premium-test-page">

<div class="sticky-nav-panel">

  <div class="test-topbar">

  <div class="ultra-timer">

    <span class="live-ping"></span>

    <span class="live-text">
      LIVE
    </span>

    <span id="floatingTimerText">
      ${dur}:00
    </span>

  </div>
  
<div class="attempt-box">

  <span class="attempt-label">Attempted</span>

  <span id="attemptCount">0</span>

  <span class="attempt-total">/ ${globalQuestions.length}</span>

</div>

</div>

  <!-- ROW 2 : QUESTION NUMBERS -->

  <div class="question-nav">

    ${globalQuestions.map((_,i)=>`

      <div
        id="nav-${i}"
        class="nav-dot"
        onclick="goToQuestion(${i})">

        ${i+1}

      </div>

    `).join('')}

  </div>

  <!-- ROW 3 : ACTION BUTTONS -->

  <div class="question-actions">

    <button
      class="clear-btn"
      onclick="clearResponse()">

      🗑️ Clear

    </button>

    <button
      class="review-btn"
      onclick="toggleReview()">

      ⭐ Review

    </button>

  </div>

</div>

<!-- FIXED PANEL END -->

<!-- PROGRESS -->

<div class="progress-wrap">

  <div
    id="progressBar"
    class="premium-progress">

  </div>

</div>

`;

  for(let i=0;i<globalQuestions.length;i++){

    const q = globalQuestions[i];

    html += `

   <div
   id="question-${i}"
   data-index="${i}"
   class="premium-question-card fade-in">
      <div class="q-top">

        <div class="q-number">
          Question ${i+1}
        </div>

        <div class="q-badge">
          ⭐ ${q.marks || 2} Marks
        </div>

      </div>

      <div class="premium-question-text">

        ${escapeHtml(q.question)}

      </div>

      <div class="premium-options">

    `;

    for(let key in q.options){

      html += `

      <div
        class="premium-option"

        onclick="
          select(
            '${q.qid}',
            '${key}',
            this
          )
        ">

        <div class="option-key">

          ${key}

        </div>

        <div class="option-value">

          ${escapeHtml(
            q.options[key]
          )}

        </div>

      </div>

      `;
    }

    html += `

      </div>

    </div>

    `;
  }

  html += `

   <button
   class="premium-submit-btn"
   onclick="submitTest()">

   Submit

   </button>

  </div>

  `;

  app.innerHTML = html;
  enableTestMode();
enterFullscreen();
visitedQuestions.add(0);
currentQuestionIndex = 0;

document
.getElementById("nav-0")
?.classList.add(
  "nav-active"
);

updatePalette();
testStartTime = Date.now();
  startFloatingTimer(dur);
}

function select(qid, opt, el){

  answers[qid] = opt;

  const parent =
    el.parentNode;

  const opts =
    parent.querySelectorAll(
      '.premium-option'
    );

  opts.forEach(o=>
    o.classList.remove(
      "premium-selected"
    )
  );

  el.classList.add(
    "premium-selected"
  );


const index =
  globalQuestions.findIndex(
    q => q.qid === qid
  );

visitedQuestions.add(index);

updatePalette();

  // Progress Update

  const attempted =
    Object.keys(answers).length;

  document.getElementById(
    "attemptCount"
  ).innerText = attempted;

  const progress =
    (attempted /
    globalQuestions.length) * 100;

  document.getElementById(
    "progressBar"
  ).style.width =
    progress + "%";

}

function clearResponse(){

  const index =
    currentQuestionIndex;

  const qid =
    globalQuestions[index].qid;

  delete answers[qid];

  const card =
    document.getElementById(
      `question-${index}`
    );

  if(card){

    card
      .querySelectorAll(
        ".premium-option"
      )
      .forEach(x =>
        x.classList.remove(
          "premium-selected"
        )
      );

  }

  updatePalette();

}

function toggleReview(){

  const index =
    currentQuestionIndex;

  if(
    reviewQuestions.has(index)
  ){

    reviewQuestions.delete(index);

  }else{

    reviewQuestions.add(index);

  }

  updatePalette();

}

function updatePalette(){

  globalQuestions.forEach(
    (q,index)=>{

      const dot =
        document.getElementById(
          `nav-${index}`
        );

      if(!dot) return;

dot.className =
  "nav-dot";

if(index === currentQuestionIndex){

  dot.classList.add(
    "nav-active"
  );

}
      const answered =
        answers[q.qid];

      const review =
        reviewQuestions.has(
          index
        );

      if(answered && review){

        dot.classList.add(
          "nav-review-answer"
        );

      }

      else if(review){

        dot.classList.add(
          "nav-review"
        );

      }

      else if(answered){

        dot.classList.add(
          "nav-completed"
        );

      }

      if(
        visitedQuestions.has(
          index
        )
      ){

        dot.classList.add(
          "visited"
        );

      }

    });

}




function startFloatingTimer(min){

  let t = min * 60;

  clearInterval(timer);

  const timerBox =
    document.getElementById(
      "floatingTimerText"
    );

  timer = setInterval(()=>{

    const m =
      Math.floor(t / 60);

    const s =
      String(t % 60)
      .padStart(2,'0');

    if(timerBox){

      timerBox.innerText =
        `${m}:${s}`;

    }

    // warning mode

if(t <= 300){

  document
    .querySelector(".ultra-timer")
    ?.classList.add(
      "timer-warning"
    );

}

    // auto submit

    if(t <= 0){

      clearInterval(timer);

      submitTest();

      return;

    }

    t--;

  },1000);

}

let submitting = false;

async function submitTest() {
  disableTestMode();
  if (submitting) return;

  submitting = true;

  clearInterval(timer);
  disableWakeLock();
 
document
.getElementById("examWatermark")
?.remove();
  const btn = document.querySelector(".premium-submit-btn");

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Submitting...";
  }

  try {
   
const response = await fetch(API, {

  method: "POST",

  redirect: "follow",

  body: JSON.stringify({

    action: "submitTest",

    studentId: studentId,

    testId: currentTest,

    answers: answers,

timeTaken: Math.floor(
  (Date.now() - testStartTime) / 1000
)
  })

});

const text = await response.text();

const data = JSON.parse(text);

    // already attempted
    if (data.error) {

      app.innerHTML = `
        <div class="container">
          <div class="card" style="text-align:center;">
            <h2>⚠️ ${data.error}</h2>

            <br>

            <button class="btn" onclick="loadTests()">
              Back
            </button>
          </div>
        </div>
      `;

      submitting = false;
      return;
    }

    // success
    app.innerHTML = `
      <div class="container">
        <div class="card" style="text-align:center;">

          <h2>✅ Test Submitted</h2>

          <br>

          <div style="
            font-size:34px;
            font-weight:700;
            color:#2e7d32;
          ">
            ${data.score} / ${data.total}
          </div>

          <br>

          <button class="btn" onclick="loadTests()">
            Back To Dashboard
          </button>

        </div>
      </div>
    `;

} catch (err) {

  console.error(err);

  app.innerHTML = `
    <div class="container">

      <div class="card"
        style="text-align:center;">

        <h2 style="
          color:red;
          font-size:20px;
        ">
          🚫 ERROR
        </h2>

        <br>

        <div style="
          word-break:break-word;
          color:#333;
          font-size:14px;
        ">
          ${err}
        </div>

        <br>

        <button class="btn"
          onclick="submitTest()">

          Retry

        </button>

      </div>

    </div>
  `;
}

  submitting = false;
}

function formatDate(dateValue){

  if(!dateValue) return "-";

  const d = new Date(dateValue);

  if(isNaN(d.getTime())) return "-";

  return d.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}

function showProfile(){
  hideNavButtons();

  fetch(`${API}?action=latestResult&studentId=${studentId}`)
  .then(r=>r.json())
  .then(d=>{

   const percent =
   Number(d.accuracy) || 0;

    app.innerHTML = `

<div class="container fade-in">

 <!-- PREMIUM PROFILE -->

<div class="profile-premium">

<div class="profile-header">

<div class="profile-avatar">
👨‍🎓
</div>

<div class="profile-user">

<h2>${window.studentName}</h2>

<p>Student ID: ${studentId}</p>

</div>

<div class="academy-badge">
MAHADEV ACADEMY TEST
</div>

</div>

<div class="profile-info-grid">

<div class="profile-info-box">
<div class="label">📱 Mobile</div>
<div class="value">${window.studentMobile}</div>
</div>

<div class="profile-info-box">
<div class="label">🎓 Class</div>
<div class="value">${window.studentClass}</div>
</div>

</div>

<div class="performance-premium">

<div class="performance-left">

<div class="performance-title">
Latest Performance
</div>

<div class="performance-score">
${d.score || 0}<span>/${d.total || 0}</span>
</div>

<div class="rank-badge-ui">
🏆 Rank #${d.rank || "-"}
</div>

</div>

<div class="accuracy-ring">

<svg viewBox="0 0 160 160">

<circle
cx="80"
cy="80"
r="60"
class="ring-bg"
/>

<circle
cx="80"
cy="80"
r="60"
class="ring-progress"
style="
stroke-dashoffset:${377-(377*percent/100)};
"
/>

</svg>

<div class="ring-text">
<div>${percent}%</div>
<span>Accuracy</span>
</div>

</div>

</div>

</div>

  <!-- HISTORY -->

  <h3 style="
    margin:18px 0 10px;
    font-size:20px;
  ">
    📊 Previous Tests
  </h3>

  <div id="history"></div>

  <button class="btn" onclick="loadTests()">
    ← Back To Dashboard
  </button>

</div>
`;

    loadHistory();
  });
}

function formatDuration(seconds){

  seconds = Number(seconds) || 0;

  const mins = Math.floor(seconds / 60);

  const secs = seconds % 60;

  return `${mins}m ${secs}s`;
}

let showCount = 4;
function loadHistory(){
  fetch(`${API}?action=allResults&studentId=${studentId}`)
  .then(r=>r.json())
  .then(list=>{

    let html = "";
for(let i=0;i<Math.min(showCount,list.length);i++){

  const t = list[i];
  console.log(JSON.stringify(t, null, 2));

  const percent =
    Math.round(
      (Number(t.score) / Number(t.total)) * 100
    );
let badgeText = "";
let badgeClass = "";

if(percent >= 95){

  badgeText = "👑 Legend";
  badgeClass = "legend";

}
else if(percent >= 90){

  badgeText = "🏆 Champion";
  badgeClass = "champion";

}
else if(percent >= 80){

  badgeText = "⭐⭐ Excellent";
  badgeClass = "excellent";

}
else if(percent >= 60){

  badgeText = "⭐ Good";
  badgeClass = "good";

}
else if(percent >= 46){

  badgeText = "👍 Average";
  badgeClass = "average";

}
else if(percent >= 35){

  badgeText = "⚠️ Need Improvement";
  badgeClass = "improve";

}
 else{

  badgeText = "";
  badgeClass = "";

}
html += `

<div class="history-premium-card">

  ${badgeText ? `
    <div class="history-badge ${badgeClass}">
      ${badgeText}
    </div>
  ` : ""}

  <div class="history-top">

    <div class="history-icon">
      🧠
    </div>

    <div class="history-content">

      <div class="history-title">
        ${t.testName || "General Knowledge"}
      </div>

      <div class="history-id">
        Test ID : ${t.testId}
      </div>

    </div>

  </div>

  <div class="history-divider"></div>

  <div class="history-score-row">

    <div class="history-score">
      🏆 Score: ${t.score}/${t.total}
    </div>

    <div class="history-accuracy">
      🎯 Accuracy: ${t.accuracy || percent}%
    </div>

  </div>

  <div class="history-time">

    ⏱️ Time Taken:
    ${formatDuration(t.timeTaken || 0)}

  </div>

  ${
    t.weakTopics && t.weakTopics.length

    ? `

      <div class="history-weak">

        <div class="history-weak-title">

          ⚠️ Weak Areas

        </div>

        <ul class="history-weak-list">

          ${t.weakTopics.map(topic => `
            <li>${topic}</li>
          `).join("")}

        </ul>

      </div>

    `

    : ""

  }

  <div class="history-date">

    📅 ${formatDate(t.submittedAt)}

  </div>

  <button
    class="history-analysis-btn"
    onclick="openAnalysis('${t.testId}', showProfile)">

    📊 Detailed Analysis

  </button>

</div>

`;}

    if(list.length > showCount){
      html += `<button class="btn" onclick="showMore()">Show More</button>`;
    } 
    else if(showCount > 4){
      html += `<button class="btn" onclick="showLess()">Show Less</button>`;
    }

    document.getElementById("history").innerHTML = html;
  });
}

function showMore(){
  showCount += 5;
  loadHistory();
}

function showLess(){
  showCount = 4;
  loadHistory();
}

function openAnalysis(testId, backFn){

  previousPage = backFn;

  hideNavButtons();

  // बाकी पूरा code जैसा है वैसा ही रहेगा


  hideNavButtons();

  app.innerHTML = `

  <div class="analysis-page">

    <div class="analysis-loading">

      <div class="loader"></div>

      <p>Loading Premium Analysis...</p>

    </div>

  </div>

  `;

fetch(
  `${API}?action=analysis&studentId=${studentId}&testId=${testId}`
)

.then(r => r.json())

.then(data=>{

  console.log("ANALYSIS DATA =", data);

  if(data.error){

    app.innerHTML = `
      <div class="analysis-error">
        <div class="glass-error">
          <div class="error-title">
            ${data.error}
          </div>

          <button class="btn"
            onclick="goBack()">
            Back To Dashboard
          </button>

        </div>
      </div>
    `;

    return;
  }

  // बाकी analysis code

  const accuracy =
  data.correctCount + data.wrongCount
    ? Math.round(
   (
    data.correctCount /
    (
      data.correctCount +
      data.wrongCount
     )
     ) * 100
     )
     : 0;
let badgeText = "";
let badgeClass = "";

if(data.score >= 95){
  badgeText = "👑 Legend";
  badgeClass = "legend";
}
else if(data.score >= 75){
  badgeText = "⭐ Good";
  badgeClass = "good";
}
else if(data.score >= 50){
  badgeText = "👍 Average";
  badgeClass = "average";
}
else{
  badgeText = "⚠️ Need Improvement";
  badgeClass = "improve";
}
    let html = `

    <div class="analysis-page fade-in">

      <!-- TOP BAR -->

      <div class="analysis-navbar">

<button
  class="premium-back-btn"
  onclick="goBack()">

  ← Back

</button>

        <div class="analysis-heading">

          <div class="analysis-mini">
            PERFORMANCE REPORT
          </div>

          <div class="analysis-big">
            📊 Test Analysis
          </div>

        </div>

      </div>

      <!-- HERO -->

      <div class="premium-score-card">

        <div class="score-glow"></div>
<div style="
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:20px;
">

  <div style="
    font-size:24px;
    font-weight:800;
    color:white;
  ">
    ${data.testName}
  </div>

  <div class="${badgeClass}" style="
    padding:8px 16px;
    border-radius:999px;
    font-weight:700;
    background:rgba(255,255,255,.15);
    color:white;
  ">
    ${badgeText}
  </div>

</div>
        <div class="score-ring">

          <div class="score-ring-inner">

            <div class="score-main">
              ${data.score}
            </div>

            <div class="score-total">
              / ${data.total}
            </div>

          </div>

        </div>

        <div class="premium-accuracy">

          Accuracy ${accuracy}%

        </div>

<div class="premium-stats">

  <div class="stat-box">
    <div class="stat-label">Questions</div>
    <div class="stat-value">${data.questions.length}</div>
  </div>

  <div class="stat-box">
    <div class="stat-label">Score</div>
    <div class="stat-value">${data.score}</div>
  </div>

  <div class="stat-box">
    <div class="stat-label">Rank</div>
    <div class="stat-value">#${data.rank}</div>
  </div>

</div>

<div class="premium-stats answer-stats">

  <div class="stat-box">
    <div class="stat-label">Correct</div>
    <div class="stat-value">${data.correctCount}</div>
  </div>

  <div class="stat-box">
    <div class="stat-label">Unattempted</div>
    <div class="stat-value">${data.unattemptedCount}</div>
  </div>

  <div class="stat-box">
    <div class="stat-label">Wrong</div>
    <div class="stat-value">${data.wrongCount}</div>
  </div>

</div>

            </div>

          </div>

        </div>

      </div>

    `;

data.questions.forEach((q,index)=>{

  const attempted =
    q.studentAnswer !== "" &&
    q.studentAnswer !== null &&
    q.studentAnswer !== undefined;

  const correct =
    attempted &&
    q.studentAnswer === q.correctAnswer;

      html += `

<div class="
  premium-analysis-card
  ${
    !attempted
      ? 'premium-unattempted'
      : correct
        ? 'premium-correct'
        : 'premium-wrong'
  }
">

        <!-- TOP -->

        <div class="question-top">

          <div class="
          question-badge
          ${
         !attempted
         ? 'badge-unattempted'
          : correct
          ? 'badge-correct'
          : 'badge-wrong'
        }
        ">

            Q${index+1}

          </div>

<div class="
  status-pill
  ${
    !attempted
      ? 'pill-unattempted'
      : correct
        ? 'pill-correct'
        : 'pill-wrong'
  }
">

  ${
    !attempted
      ? '⚪ Not Attempted'
      : correct
        ? '✅ Correct'
        : '❌ Wrong'
  }

</div>

        </div>

        <!-- QUESTION -->

        <div class="premium-question">

          ${escapeHtml(q.question)}

        </div>

        <!-- YOUR ANSWER -->

        <div class="premium-answer-card user-card">

          <div class="answer-title">
            Your Answer
          </div>

<div class="
  answer-value
  ${
    !attempted
      ? 'unattempted-answer-text'
      : correct
        ? 'correct-answer-text'
        : 'wrong-answer-text'
  }
">

            ${q.studentAnswer
              ? `${q.studentAnswer}.
                 ${escapeHtml(
                   q.options[q.studentAnswer]
                 )}`
              : 'Not Attempted'}

          </div>

        </div>

        <!-- CORRECT ANSWER -->

        <div class="
          premium-answer-card
          correct-card-ui
        ">

          <div class="answer-title">
            Correct Answer
          </div>

          <div class="correct-answer-text">

            ${q.correctAnswer}.
            ${escapeHtml(
              q.options[q.correctAnswer]
            )}

          </div>

        </div>

        

        ${!correct ? `

<button
  class="show-exp-btn"
  onclick="toggleExp(${index})">

  📘 Show Explanation

</button>

<div
  id="exp-${index}"
  class="hidden-exp">

  <div class="exp-inner">

    ${q.explanation
      ? escapeHtml(q.explanation)
      : 'No explanation available'}

  </div>

</div>

` : ''}

      </div>

      `;

    });

    html += `</div>`;

    app.innerHTML = html;

  })

  .catch(err=>{

    console.error(
      "ANALYSIS FAILED =",
      err
    );

    app.innerHTML = `

    <div class="analysis-error">

      <div class="glass-error">

        <div class="error-icon">
          🚫
        </div>

        <div class="error-title">
          Failed To Load Analysis
        </div>

        <button
          class="btn"
          onclick="loadTests()">

          Back To Dashboard

        </button>

      </div>

    </div>

    `;

  });

}
function toggleExp(id){

  const box =
    document.getElementById(
      `exp-${id}`
    );

  if(box.style.maxHeight){

    box.style.maxHeight = null;

  } else {

    box.style.maxHeight =
      box.scrollHeight + "px";

  }

}
function goBack(){

  const btn = document.querySelector(".premium-back-btn");

  if(btn){
    btn.innerHTML = "⏳";
    btn.disabled = true;
  }

  if(previousPage){
    previousPage();
  }else{
    loadTests();
  }

}

function initializeCountdowns(){

  startDailyCountdown();

  if(window.liveTests){

    window.liveTests.forEach(test=>{

      startCountdown(
        test.releaseDate,
        test.testId
      );

    });

  }

}



function goToQuestion(index){
   currentQuestionIndex = index;

  const question =
    document.getElementById(
      `question-${index}`
    );

  if(!question) return;

  document
    .querySelectorAll(".nav-dot")
    .forEach(dot =>
      dot.classList.remove("nav-active")
    );

  document
    .getElementById(`nav-${index}`)
    ?.classList.add("nav-active");

  question.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });
document
.getElementById(`nav-${index}`)
?.scrollIntoView({

  behavior:"smooth",
  inline:"center",
  block:"nearest"

});
}
window.addEventListener("scroll", () => {

  globalQuestions.forEach((q,index)=>{

    const el =
      document.getElementById(
        `question-${index}`
      );

    if(!el) return;

    const rect =
      el.getBoundingClientRect();

if(
  rect.top < 250 &&
  rect.bottom > 250
){

  if(currentQuestionIndex !== index){

    currentQuestionIndex =
      index;

    document
      .querySelectorAll(
        ".nav-dot"
      )
      .forEach(dot =>
        dot.classList.remove(
          "nav-active"
        )
      );

    document
      .getElementById(
        `nav-${index}`
      )
      ?.classList.add(
        "nav-active"
      );

    document
      .getElementById(
        `nav-${index}`
      )
      ?.scrollIntoView({

        behavior:"smooth",

        inline:"center",

        block:"nearest"

      });

  }

}

  });

});


function startCountdown(releaseDate, testId){

  const countdownEl =
    document.getElementById(
      `upcomingCountdown-${testId}`
    );

  if(!countdownEl) return;

  const card = countdownEl.closest(
    ".upcoming-test-card"
  );

  function update(){

    const now = new Date();

    const release =
      new Date(releaseDate);

    const diff =
      release - now;

    if(diff <= 0){

      card?.classList.remove("urgent");

      countdownEl.innerHTML =
        "🚀 Start Test";

      countdownEl.style.cursor =
        "pointer";

      countdownEl.onclick = () =>
        showInstructions(testId, 30);

      return;
    }

    if(diff <= 2 * 60 * 60 * 1000){

      card?.classList.add("urgent");

    }else{

      card?.classList.remove("urgent");

    }

    const totalSeconds =
      Math.floor(diff / 1000);

    const days =
      Math.floor(totalSeconds / 86400);

    const hours =
      Math.floor(
        (totalSeconds % 86400) / 3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      totalSeconds % 60;

    let text = "";

    const dayName =
      release.toLocaleDateString(
        "en-US",
        {
          weekday: "long"
        }
      );

    const startTime =
      release.toLocaleTimeString(
        "en-US",
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }
      );

    if(days >= 2){

      text =
        `📅 Starts on ${dayName} @ ${startTime}`;

    }else if(days === 1){

      text =
        `🌞 Starts Today @ ${startTime}`;

    }else if(hours >= 1){

      text =
        `⏳ Unlocks in ${hours} Hour${hours !== 1 ? "s" : ""} ${minutes} Min`;

    }else{

      text =
        `🚀 Unlocks in ${minutes} Min ${seconds} Sec`;

    }

    countdownEl.innerHTML = text;

  }

  update();

  setInterval(update, 1000);

}

function updateExamCountdowns(){

  const exams = [

    {
      id: "jnvstCountdown",
      date: "2026-11-15"
    },

    {
      id: "olympiadCountdown",
      date: "2026-09-30"
    }

  ];

  exams.forEach(exam => {

    const el =
      document.getElementById(exam.id);

    if(!el) return;

    const today = new Date();

    const examDate = new Date(exam.date);

    const diff =
      examDate - today;

    const days =
      Math.ceil(
        diff / (1000 * 60 * 60 * 24)
      );

    el.innerHTML = days > 0

      ? `${days}<span>Days Left</span>`

      : `<span>Exam Started</span>`;

  });

}

document.addEventListener("contextmenu", e => {
  if(document.body.classList.contains("test-mode")){
    e.preventDefault();
  }
});

document.addEventListener("copy", e => {
  if(document.body.classList.contains("test-mode")){
    e.preventDefault();
  }
});

document.addEventListener("cut", e => {
  if(document.body.classList.contains("test-mode")){
    e.preventDefault();
  }
});

document.addEventListener("visibilitychange", () => {

  if(
    document.hidden &&
    document.body.classList.contains("test-mode")
  ){

    alert(
      "Test closed because you switched tabs."
    );

    submitTest();
  }

});

document.addEventListener(
  "fullscreenchange",
  () => {

    if(
      !document.fullscreenElement &&
      document.body.classList.contains("test-mode")
    ){

      alert(
        "Fullscreen exited. Test submitted."
      );

      submitTest();
    }
  }
);

document.addEventListener("selectstart", e => {

  if(document.body.classList.contains("test-mode")){
    e.preventDefault();
  }

});

document.addEventListener("dragstart", e => {

  if(document.body.classList.contains("test-mode")){
    e.preventDefault();
  }

});

document.addEventListener("keydown", e => {

  if(!document.body.classList.contains("test-mode")){
    return;
  }

  const key = e.key.toLowerCase();

  if(
    e.ctrlKey &&
    ["a","c","x","u","s","p"].includes(key)
  ){
    e.preventDefault();
  }

});
