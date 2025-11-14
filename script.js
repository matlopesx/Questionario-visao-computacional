const URL = "./my_model/";
let model, webcam, ctx, labelContainer, maxPredictions;
let currentQuestion = 0;
let timerValue = 10;
let timerInterval;
let running = false;

const questions = [
  "Você gosta de tecnologia?",
  "Você gostaria de trabalhar com IA?",
  "Você gosta de jogos digitais?",
  "Você prefere café a chá?",
  "Você está feliz hoje?"
];

let answers = [];

// Função para normalizar texto (remove acentos e coloca em minúsculas)
function normalizeText(s) {
  if (!s) return "";
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function init() {
  if (running) return;
  running = true;

  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  const size = 250;
  const flip = true;
  webcam = new tmPose.Webcam(size, size, flip);
  await webcam.setup();
  await webcam.play();
  window.requestAnimationFrame(loop);

  const canvas = document.getElementById("canvas");
  canvas.width = size;
  canvas.height = size;
  ctx = canvas.getContext("2d");
  canvas.classList.add("active");

  labelContainer = document.getElementById("label-container");
  labelContainer.innerHTML = "";

  startQuestionCycle();
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

let currentPose = "Nenhuma";

async function predict() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const prediction = await model.predict(posenetOutput);

  drawPose(pose);

  // Obter a classe mais provável
  const top = prediction.reduce((prev, curr) =>
    curr.probability > prev.probability ? curr : prev
  );

  const answerElement = document.getElementById("answer");
  if (top.probability > 0.8) {
    currentPose = top.className; // mantém o valor original
    const norm = normalizeText(currentPose);
    answerElement.textContent = currentPose.toUpperCase();
    answerElement.style.color = norm.includes("sim") ? "#00ff99" : "#ff6666";
  }
}

function drawPose(pose) {
  if (webcam.canvas) {
    ctx.drawImage(webcam.canvas, 0, 0);
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}

function startQuestionCycle() {
  const questionElement = document.getElementById("question");
  const timerElement = document.getElementById("timer");
  const answerElement = document.getElementById("answer");

  currentQuestion = 0;
  answers = [];
  nextQuestion();

  function nextQuestion() {
    if (currentQuestion >= questions.length) {
      showSummary();
      return;
    }

    questionElement.textContent = questions[currentQuestion];
    timerValue = 10;
    timerElement.textContent = `⏳ ${timerValue}`;
    answerElement.textContent = "";
    currentPose = "Nenhuma";

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerValue--;
      timerElement.textContent = `⏳ ${timerValue}`;
      if (timerValue <= 0) {
        clearInterval(timerInterval);

        // Normaliza a resposta para detectar sim/não corretamente
        const normPose = normalizeText(currentPose);
        let finalAnswer;
        if (normPose.includes("sim")) {
          finalAnswer = "SIM";
        } else if (normPose.includes("nao")) {
          finalAnswer = "NÃO";
        } else {
          finalAnswer = "Indefinido";
        }

        answers.push({ question: questions[currentQuestion], answer: finalAnswer });
        currentQuestion++;
        nextQuestion();
      }
    }, 1000);
  }
}

function showSummary() {
  const container = document.getElementById("question-box");
  container.innerHTML = `
    <h2>🧾 Resumo das suas respostas</h2>
    <ul id="summary-list"></ul>
    <button id="restart-btn">Reiniciar</button>
  `;

  // ativa scroll da página
  document.body.classList.add("summary-active");

  const summaryList = document.getElementById("summary-list");
  summaryList.style.listStyle = "none";
  summaryList.style.padding = "0";

  answers.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${i + 1}. ${item.question}</strong><br>
      <span style="color:${
        item.answer === "SIM"
          ? "#00ff99"
          : item.answer === "NÃO"
          ? "#ff6666"
          : "#cccccc"
      }">${item.answer}</span>
    `;
    li.style.marginBottom = "12px";
    summaryList.appendChild(li);
  });

  const restartBtn = document.getElementById("restart-btn");
  restartBtn.style.marginTop = "15px";
  restartBtn.style.padding = "10px 20px";
  restartBtn.style.border = "none";
  restartBtn.style.borderRadius = "8px";
  restartBtn.style.background = "linear-gradient(135deg, #00e0ff, #0077ff)";
  restartBtn.style.color = "white";
  restartBtn.style.fontWeight = "600";
  restartBtn.style.cursor = "pointer";
  restartBtn.onclick = () => location.reload();
}
