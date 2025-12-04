// === Black Dollar Trust Reader v5.1 ===
// PDF + TXT Reader with Native Speech Synthesis

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const bookList = document.getElementById("bookList");
const pdfCanvas = document.getElementById("pdfCanvas");
const textPreview = document.getElementById("textPreview");
const progressBar = document.getElementById("progressBar");
const voiceSelect = document.getElementById("voiceSelect");
const readBtn = document.getElementById("readBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageIndicator = document.getElementById("pageIndicator");
const bookTitle = document.getElementById("bookTitle");

let pdfDoc = null;
let currentText = "";
let currentBook = "";
let currentPage = 1;
let synth = window.speechSynthesis;
let pdfTextPerPage = [];

// === Voices ===
function loadVoices() {
  const voices = synth.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}
function initVoices() {
  if (synth.getVoices().length === 0) setTimeout(initVoices, 300);
  else loadVoices();
}
initVoices();
speechSynthesis.onvoiceschanged = loadVoices;

// === Upload ===
uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please select a file first.");

  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();
  currentBook = file.name.replace(/\.[^/.]+$/, "");
  bookTitle.textContent = `📖 ${currentBook}`;
  pdfCanvas.style.display = "none";
  textPreview.textContent = "";

  if (ext === "txt") {
    reader.onload = () => showText(reader.result, file.name);
    reader.readAsText(file);
  } else if (ext === "pdf") {
    reader.onload = () => loadAndRenderPDF(reader.result, file.name);
    reader.readAsArrayBuffer(file);
  } else {
    alert("Only PDF or TXT files are supported.");
  }
});

// === TXT Display ===
function showText(content, name) {
  bookList.textContent = `📘 Loaded: ${name}`;
  currentText = content.trim();
  textPreview.innerHTML = formatBookText(content);
}

function formatBookText(text) {
  return text
    .split(/\n\s*\n/)
    .map(p => `<p>${p.trim()}</p>`)
    .join("");
}

// === PDF Display & Extraction ===
async function loadAndRenderPDF(data, filename) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

  const loadingTask = pdfjsLib.getDocument({ data });
  pdfDoc = await loadingTask.promise;
  pdfTextPerPage = [];
  currentPage = 1;
  bookList.textContent = `📗 Loaded PDF: ${filename}`;

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(" ");
    pdfTextPerPage.push(text);
  }

  showPage(currentPage);
}

async function showPage(num) {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: 1.3 });
  const ctx = pdfCanvas.getContext("2d");

  pdfCanvas.height = viewport.height;
  pdfCanvas.width = viewport.width;

  await page.render({ canvasContext: ctx, viewport }).promise;

  textPreview.innerHTML = `<p>${pdfTextPerPage[num - 1] || ""}</p>`;
  pageIndicator.textContent = `Page ${num} of ${pdfDoc.numPages}`;
  pdfCanvas.style.display = "block";
}

// === Page Navigation ===
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) showPage(--currentPage);
});
nextPageBtn.addEventListener("click", () => {
  if (pdfDoc && currentPage < pdfDoc.numPages) showPage(++currentPage);
});

// === Text-to-Speech ===
readBtn.addEventListener("click", async () => {
  if (!pdfDoc && !currentText.trim()) {
    alert("Please upload a readable file first.");
    return;
  }
  synth.cancel();

  const textToRead = pdfDoc
    ? pdfTextPerPage[currentPage - 1] || ""
    : currentText;

  if (textToRead.trim().length < 3) {
    alert("No readable text on this page.");
    return;
  }

  const utter = new SpeechSynthesisUtterance(textToRead);
  const voices = synth.getVoices();
  utter.voice = voices.find(v => v.name === voiceSelect.value) || voices[0];
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  utter.onerror = e => console.error("Speech error:", e);
  synth.speak(utter);
});

pauseBtn.addEventListener("click", () => {
  if (synth.speaking) {
    synth.paused ? synth.resume() : synth.pause();
  }
});
stopBtn.addEventListener("click", () => synth.cancel());
