const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const SIZE = 25;
const ROWS = 7;
const COLS = 7;

let hexGrid = [];
let score = 0;
let moves = 0;
let gameOver = false;
let popups = [];
let userName = localStorage.getItem("userName") || "Hex-user";


let currentScreen = "title"; // title / modeSelect / game / gameOver / highScore / gameClear / resetConfirm
let currentMode = null;

// ------------------ ゲームモード ------------------
const gameModes = {
  easy:   { name: "Easy", moves: 15, colors: ["red","blue","yellow"], highScoreKey: "easyHighScore" },
  hard:   { name: "Hard", moves: 15, colors: ["red","blue","yellow","green"], highScoreKey: "hardHighScore" },
  challenge: { name: "5000点チャレンジ", moves: 9999, targetScore: 5000, colors: ["red","blue","yellow","green"], highScoreKey: "challengeHighScore" },
  extreme:   { name: "Extreme", moves: 15, colors: ["red","blue","yellow","green","purple"], highScoreKey: "extremeHighScore", unlocked: false }
};

// ------------------ Extreme解放状態を永続化 ------------------
// ブラウザ再起動後も解放状態を保持する
if(localStorage.getItem("extremeUnlocked") === "true"){
  gameModes.extreme.unlocked = true;
}// ------------------ ハイスコア ------------------
function getHighScore(mode) {
  if (!mode) return 0;
  const val = localStorage.getItem(mode.highScoreKey);
  if(mode.name === "Extreme" && !mode.unlocked) return "???";
  return val || 0;
}

function saveHighScore() {
  const key = currentMode.highScoreKey;
  const prev = parseInt(localStorage.getItem(key)) || 0;
  if(score > prev) localStorage.setItem(key, score);
}

function saveChallengeHighScore() {
  const key = currentMode.highScoreKey;
  const movesUsed = currentMode.moves - moves;
  const prev = parseInt(localStorage.getItem(key)) || Infinity;
  if(movesUsed < prev) localStorage.setItem(key, movesUsed);
  // Extreme 解放条件
  if(currentMode.name === "Hard" && score >= 6500){
    gameModes.extreme.unlocked = true;
  }
}

// ------------------ ハイスコア画面ボタン定義 ------------------
const highscoreButtons = [
  {mode: "easy", x: 400, y: 180, width: 160, height: 40, label: "ランキングに登録"},
  {mode: "hard", x: 400, y: 230, width: 160, height: 40, label: "ランキングに登録"},
  {mode: "challenge", x: 400, y: 280, width: 160, height: 40, label: "ランキングに登録"},
  {mode: "extreme", x: 400, y: 330, width: 160, height: 40, label: "ランキングに登録"},
];

// ------------------ 六角形描画 ------------------
function drawHex(x, y, size, color, exists){
  if(!exists) return;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const angle = Math.PI/3*i;
    const px = x + size*Math.cos(angle);
    const py = y + size*Math.sin(angle);
    if(i===0) ctx.moveTo(px,py);
    else ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fillStyle=color;
  ctx.fill();
  ctx.strokeStyle="black";
  ctx.lineWidth=2;
  ctx.stroke();
}

// ------------------ グリッド初期化 ------------------
function drawGrid(){
  const hexHeight = SIZE * Math.sqrt(3);
  const xSpacing = SIZE*1.5;
  const ySpacing = hexHeight;

  hexGrid = [];
  for(let col=0;col<COLS;col++){
    hexGrid[col]=[];
    for(let row=0;row<ROWS;row++){
      const x = 100 + col * xSpacing;
      const y = 100 + row * ySpacing + (col%2===1?ySpacing/2:0);
      const color = currentMode ? currentMode.colors[Math.floor(Math.random()*currentMode.colors.length)] : gameModes.easy.colors[Math.floor(Math.random()*3)];
      hexGrid[col][row]={x,y,color,exists:true,targetY:y};
      drawHex(x,y,SIZE,color,true);
    }
  }
}

// ------------------ 再描画 ------------------
function drawAll(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  switch(currentScreen){
    case "title": drawTitleScreen(); break;
    case "modeSelect": drawModeSelectScreen(); break;
    case "highScore": drawHighScoreScreen(); break;
    case "game": drawGameScreen(); break;
    case "gameOver": drawGameOverScreen(); break;
    case "gameClear": drawGameClearScreen(); break;
    case "resetConfirm": drawResetConfirmScreen(); break;
  }
drawUserName();
}

// ------------------ 画面描写 ------------------
function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch(currentScreen){
    case "title":
      drawTitleScreen();
      break;
    case "modeSelect":
      drawModeSelectScreen();
      break;
    case "game":
      drawGameScreen();
      break;
    case "gameOver":
      drawGameOverScreen();
      break;
    case "gameClear":
      drawGameClearScreen();
      break;
    case "resetConfirm":
      drawResetConfirmScreen();
      break;
    case "highScore":
      drawHighScoreScreen();
      break;
    default:
      // 万一のデフォルトはタイトル画面
      drawTitleScreen();
      break;
  }

  // 画面共通要素
  drawUserName();
}
// タイトル画面
function drawTitleScreen(){
  ctx.font="40px Arial"; ctx.fillStyle="black";
  ctx.fillText("六角形パズルゲーム",100,100);
  ctx.font="18px Arial";
  ctx.fillText("同じ色の六角形をクリックして消そう！", 90, 160);
  ctx.fillText("たくさんつなげるほど高得点！", 120, 185);
  ctx.font="30px Arial";
  ctx.fillText("スタート",200,250);
  ctx.fillText("ハイスコア",200,320);
  ctx.fillText("リセット",200,400);
}

// モード選択画面
function drawModeSelectScreen(){
  ctx.font="30px Arial"; ctx.fillStyle="black";
  ctx.fillText("モードを選んでください",100,100);
  ctx.fillText("1. Easy (3色)",150,200);
  ctx.fillText("2. Hard (4色)",150,250);
  ctx.fillText("3. 5000点チャレンジ (4色)",150,300);
  if(gameModes.extreme.unlocked){
    ctx.fillText("4. Extreme (5色)",150,350);
  }
  ctx.fillText("戻る",150,400);
}

// ゲーム画面
function drawGameScreen(){
  for(let col=0; col<COLS; col++){
    for(let row=0; row<ROWS; row++){
      const hex = hexGrid[col][row];
      drawHex(hex.x, hex.y, SIZE, hex.color, hex.exists);
    }
  }
  drawScore();
  drawPopups();

  // タイトルに戻るボタン
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("タイトルに戻る", canvas.width - 160, 60);
}

// GameOver画面
function drawGameOverScreen(){
  ctx.font="40px Arial"; ctx.fillStyle="red";
  ctx.fillText("Game Over!",150,200);
  ctx.font="30px Arial"; ctx.fillStyle="black";
  ctx.fillText("Your Score: "+score,150,250);
  ctx.fillText("もう一度",150,300);
  ctx.fillText("タイトルに戻る",150,350);

  // Extreme解放ウィンドウ
  if(gameModes.extreme.unlocked && gameModes.extreme.showWindow){
    const winX = 50, winY = 100, winW = 400, winH = 100;
    ctx.fillStyle = "rgba(255,255,200,0.95)";
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = "black"; ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.fillStyle = "black"; ctx.font = "20px Arial";
    ctx.fillText("Extreme モードが解放されました！", winX + 20, winY + 40);

    // OKボタン
    const btnX = winX + winW - 80, btnY = winY + winH - 40, btnW = 60, btnH = 30;
    ctx.fillStyle = "lightblue"; ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = "black"; ctx.font = "18px Arial";
    ctx.fillText("OK", btnX + 15, btnY + 22);
    gameModes.extreme.okButton = {x: btnX, y: btnY, w: btnW, h: btnH};
  }
}

// GameClear画面
function drawGameClearScreen(){
  ctx.font="40px Arial"; ctx.fillStyle="green";
  ctx.fillText("Challenge Cleared!",100,200);
  ctx.font="30px Arial"; ctx.fillStyle="black";
  ctx.fillText("Used Moves: "+(currentMode.moves-moves),150,250);
  ctx.fillText("もう一度",150,300);
  ctx.fillText("タイトルに戻る",150,350);
}

// リセット確認画面
function drawResetConfirmScreen(){
  ctx.font="30px Arial"; ctx.fillStyle="black";
  ctx.fillText("本当にリセットしますか？",100,200);
  ctx.fillText("はい",200,250);
  ctx.fillText("いいえ",300,250);
}

// ------------------ ハイスコア画面（最後に置く） ------------------
function drawHighScoreScreen(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font = "30px Arial"; ctx.fillStyle = "black";
  ctx.fillText("モード別ハイスコア", 100, 100);

  ctx.font = "24px Arial";
  ctx.fillText("Easy: " + (localStorage.getItem("easyHighScore") || 0), 150, 200);
  ctx.fillText("Hard: " + (localStorage.getItem("hardHighScore") || 0), 150, 250);
  ctx.fillText("5000点チャレンジ: " + (localStorage.getItem("challengeHighScore") || 0), 150, 300);
  const extremeText = gameModes.extreme.unlocked ? "Extreme: " + (localStorage.getItem("extremeHighScore") || 0) : "???: 0";
  ctx.fillText(extremeText, 150, 350);

  // 登録ボタン描写
  highscoreButtons.forEach(b => {
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = "#000";
    ctx.font = "16px Arial"; // 文字小さめ
    ctx.fillText(b.label, b.x + 10, b.y + 25);
  });

  // 戻るボタン
  ctx.fillStyle = "#aaa";
  ctx.fillRect(150, 400, 120, 40);
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.fillText("戻る", 160, 430);
}
// ------------------ クリック処理 ------------------
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if(currentScreen === "title"){
    if(mx >= 200 && mx <= 350 && my >= 230 && my <= 270){ 
      currentScreen = "modeSelect"; 
      drawAll(); 
    }
    else if(mx >= 200 && mx <= 350 && my >= 300 && my <= 340){ 
      currentScreen = "highScore"; 
      drawAll(); 
    }
    else if(mx >= 200 && mx <= 350 && my >= 380 && my <= 420){ 
      currentScreen = "resetConfirm"; 
      drawAll(); 
    }
  }
  else if(currentScreen === "resetConfirm"){
    if(mx >= 200 && mx <= 240 && my >= 240 && my <= 270){ // はい
      localStorage.clear();
      location.reload();
    } else if(mx >= 300 && mx <= 340 && my >= 240 && my <= 270){ // いいえ
      currentScreen = "title"; 
      drawAll();
    }
  }
else if(currentScreen === "highScore") {
  // 戻るボタン判定
  const backBtn = {x:150, y:400, width:120, height:40};
  if(mx >= backBtn.x && mx <= backBtn.x + backBtn.width &&
     my >= backBtn.y && my <= backBtn.y + backBtn.height){
    currentScreen = "title";
    drawAll();
    return;
  }

  // 2. 各モードのランキング登録ボタン
  for(let i = 0; i < highscoreButtons.length; i++){
    const b = highscoreButtons[i];
    if(mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + b.height){
      const highScore = getHighScore(gameModes[b.mode]);
      sendScoreToGAS(b.mode, highScore, userName);
      return; // 送信後は他の判定を無視
    }
  }
}
  else if(currentScreen === "modeSelect"){
    if(my >= 180 && my <= 220) startGame("easy");
    else if(my >= 230 && my <= 270) startGame("hard");
    else if(my >= 280 && my <= 320) startGame("challenge");
    else if(gameModes.extreme.unlocked && my >= 330 && my <= 370) startGame("extreme");
    else if(my >= 380 && my <= 420){ // 戻るボタン
      currentScreen = "title";
      drawAll();
    }
  }
  else if(currentScreen === "gameOver"){
    if(gameModes.extreme.unlocked && gameModes.extreme.showWindow){
      const btn = gameModes.extreme.okButton;
      if(mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h){
        gameModes.extreme.showWindow = false;
        drawAll();
        return;
      }
    }
    if(my >= 280 && my <= 320) startGame(currentMode.name.toLowerCase());
    else if(my >= 330 && my <= 370){ currentScreen="title"; drawAll(); }
  }
  else if(currentScreen === "gameClear"){
    if(my >= 280 && my <= 320) startGame("challenge");
    else if(my >= 330 && my <= 370){ 
      currentScreen = "title"; 
      currentMode = null;
      drawAll(); 
    }
  }
  else if(currentScreen === "game") {
    if(mx >= canvas.width - 160 && mx <= canvas.width - 20 &&
       my >= 40 && my <= 70){
      currentScreen = "title";
      currentMode = null;
      drawAll();
      return;
    }
    handleHexClick(mx, my);
  }
});

// ------------------ GAS関数------------------
function sendScoreToGAS(mode, score, userName){
  const url = "https://script.google.com/macros/s/AKfycbwFtr-mUnW8SwqKoZYT8QDX0IRzfjKwKos79oHWQLXTqYuQDPvBtz884LkePOfoTPK8/exec"; // 実際のURLに置き換え
  const data = {
    mode: mode,
    score: score,
    name: userName
  };

  console.log("送信開始", data);

  fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(resData => {
    console.log("送信完了", resData);
    alert("ランキングに登録しました！");
  })
  .catch(err => {
    console.error("fetchエラー", err);
    alert("送信に失敗しました。");
  });
}

// ------------------ ゲーム開始 ------------------
function startGame(modeKey){
  currentMode=gameModes[modeKey];
  score=0;
  moves=currentMode.moves;
  gameOver=false;
  currentScreen="game";
  drawGrid();
  requestAnimationFrame(animateDrop);
}

// ------------------ ハンドルクリック ------------------
function handleHexClick(mx, my){
  if(gameOver || currentScreen !== "game") return;

  const hexHeight = SIZE * Math.sqrt(3);

  for(let col = 0; col < COLS; col++){
    for(let row = 0; row < ROWS; row++){
      const hex = hexGrid[col][row];
      if(!hex.exists) continue;

      const dx = Math.abs(mx - hex.x);
      const dy = Math.abs(my - hex.y);

      if(dx <= SIZE && dy <= hexHeight / 2){
        // 六角形を消す
        removeConnected(col, row, hex.color);
        dropHexes();
        moves--;

        // --------------------------
        // Hardモードで5000点以上でExtreme解放
        // --------------------------
       // Hardモードで5000点以上
if(currentMode.name === "Hard" && score >= 5000){
  if(!gameModes.extreme.unlocked){
    gameModes.extreme.unlocked = true;         // メモリ上で解放
    gameModes.extreme.showWindow = true;       // GameOver画面用ウィンドウ表示
    localStorage.setItem("extremeUnlocked", "true"); // 永続化
  }
}


        // --------------------------
        // ターゲットスコアがあるモード（チャレンジ系）
        // --------------------------
        if(currentMode.targetScore){
          if(score >= currentMode.targetScore){
            gameOver = true;
            currentScreen = "gameClear";
            saveChallengeHighScore();
          }
        }
        // --------------------------
        // 手数制限モード（Easy/Hard/Extreme）
        // --------------------------
        else {
          if(moves <= 0){
            gameOver = true;
            currentScreen = "gameOver";
            saveHighScore();
          }
        }

        requestAnimationFrame(animateDrop);
        drawAll();
        return;
      }
    }
  }
}
// ------------------ 消去とスコア ------------------
function removeConnected(col,row,color){
  let count=0;
  function dfs(c,r){
    if(c<0||c>=COLS||r<0||r>=ROWS) return;
    const hex=hexGrid[c][r];
    if(!hex.exists||hex.color!==color) return;
    hex.exists=false;
    count++;
    const neighbors=[[c-1,r],[c+1,r],[c,r-1],[c,r+1]];
    if(c%2===0){neighbors.push([c-1,r-1],[c+1,r-1]);}
    else {neighbors.push([c-1,r+1],[c+1,r+1]);}
    for(const [nc,nr] of neighbors) dfs(nc,nr);
  }
  dfs(col,row);

  if(count>0){
    const base=10;
    const multiplier=1+(count-1)*0.6;
    const points=Math.floor(base*Math.pow(multiplier,2));
    score+=points;
    const hex=hexGrid[col][row];
    popups.push({x:hex.x,y:hex.y,text:`+${points}`,alpha:1});
  }
}

// ------------------ 落下 ------------------
function dropHexes(){
  for(let col=0;col<COLS;col++){
    for(let row=ROWS-1;row>=0;row--){
      const hex=hexGrid[col][row];
      if(!hex.exists){
        let found=false;
        for(let r=row-1;r>=0;r--){
          if(hexGrid[col][r].exists){
            hex.color=hexGrid[col][r].color;
            hex.exists=true;
            hex.targetY=hexGrid[col][r].y;
            hexGrid[col][r].exists=false;
            found=true; break;
          }
        }
        if(!found){
          const colorsArr = currentMode.colors;
          hex.color=colorsArr[Math.floor(Math.random()*colorsArr.length)];
          hex.exists=true;
          hex.targetY=100+row*SIZE*Math.sqrt(3)+(col%2===1?SIZE*Math.sqrt(3)/2:0);
          hex.y=hex.targetY-50;
        }
      }
    }
  }
}

// ------------------ ポップアップ ------------------
function drawPopups(){
  for(let i=popups.length-1;i>=0;i--){
    const p=popups[i];
    ctx.fillStyle=`rgba(0,0,0,${p.alpha})`;
    ctx.font="16px Arial";
    ctx.fillText(p.text,p.x,p.y);
    p.y-=1;
    p.alpha-=0.02;
    if(p.alpha<=0) popups.splice(i,1);
  }
}

// ------------------ スコア ------------------
function drawScore(){
  ctx.fillStyle="black";
  ctx.font="20px Arial";
  ctx.fillText("Score: "+score,20,30);
  if(!currentMode.targetScore) ctx.fillText("Moves: "+moves,20,60);
  else ctx.fillText("Used Moves: "+(currentMode.moves-moves),20,60);
  ctx.fillText("High Score: "+getHighScore(currentMode),canvas.width-200,30);
}

// ------------------ ユーザー名表示 ------------------
function drawUserName(){
  const text = "Gameuser: " + userName;

  ctx.font = "16px Arial";
  ctx.fillStyle = "black";
  ctx.fillText(
    text,
    canvas.width - 20 - ctx.measureText(text).width,
    canvas.height - 20
  );
}

// ------------------ アニメーション ------------------
function animateDrop(){
  let moving=false;
  for(let col=0;col<COLS;col++){
    for(let row=0;row<ROWS;row++){
      const hex=hexGrid[col][row];
      if(!hex.exists) continue;
      if(hex.y<hex.targetY){
        hex.y+=10; if(hex.y>hex.targetY) hex.y=hex.targetY;
        moving=true;
      }
    }
  }
  drawAll();
  if(moving||popups.length>0) requestAnimationFrame(animateDrop);
}

// ------------------ 初期表示 ------------------
drawAll();
