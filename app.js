const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNQR9AFrFo3O1prmDJr82lxuE3ivFYCkxmaKymfaW2LIbOHDF2kAfFH136Q-hLUJCNAoPdTAIl_9um/pub?gid=0&single=true&output=csv";

const STORAGE_KEY = "stpm-grade-records-v1";
const TARGET_KEY = "stpm-target-records-v1";

const assessments = [
  { id: "sem1", label: "STPM SEM 1" },
  { id: "sem2", label: "STPM SEM 2" },
  { id: "sem3", label: "STPM SEM 3" },
];

const subjects = [
  { id: "pa", code: "900", label: "Pengajian Am", short: "P.AM", hasCoursework: true },
  { id: "geo", code: "942", label: "Geografi", short: "GEOG", hasCoursework: true },
  { id: "bm", code: "910", label: "Bahasa Melayu", short: "B.M" },
  { id: "sej", code: "940", label: "Sejarah", short: "SEJ.", hasCoursework: true },
  { id: "kmk", code: "922", label: "Kesusasteraan Melayu Komunikatif", short: "KMK" },
  { id: "eko", code: "944", label: "Ekonomi", short: "EKO." },
  { id: "btamil", code: "", label: "Bahasa Tamil", short: "B. TAMIL" },
];

const courseworkSubjects = subjects
  .filter((subject) => subject.hasCoursework)
  .map((subject) => ({
    id: `kk_${subject.id}`,
    label: `Kerja Kursus ${subject.label}`,
    short: `KK(${subject.id.toUpperCase()})`,
    parentSubjectId: subject.id,
    isCoursework: true,
  }));

const streams = [
  { id: "p2", label: "6 ATAS", prefix: "P2" },
  { id: "p1", label: "6 BAWAH", prefix: "P1" },
];

const finalStreams = [
  { id: "p2", label: "P2 / 6 ATAS", prefix: "P2" },
  { id: "p1", label: "P1 / 6 BAWAH", prefix: "P1" },
];

const gradeScale = [
  { grade: "", point: null },
  { grade: "A", point: 4.0 },
  { grade: "A-", point: 3.67 },
  { grade: "B+", point: 3.33 },
  { grade: "B", point: 3.0 },
  { grade: "B-", point: 2.67 },
  { grade: "C+", point: 2.33 },
  { grade: "C", point: 2.0 },
  { grade: "C-", point: 1.67 },
  { grade: "D+", point: 1.33 },
  { grade: "D", point: 1.0 },
  { grade: "F", point: 0.0 },
];

const weights = {
  sem1: 0.2667,
  sem2: 0.2667,
  sem3: 0.2667,
  kk: 0.2,
};

const memoryStore = {};

const state = {
  students: [],
  records: loadJson(STORAGE_KEY, {}),
  targets: loadJson(TARGET_KEY, {}),
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  wireEvents();
  populateStaticSelects();
  loadStudents();
}

function cacheElements() {
  [
    "dataStatus",
    "saveStatus",
    "reloadDataBtn",
    "exportBtn",
    "importInput",
    "inputClass",
    "inputSubject",
    "inputAssessment",
    "inputRows",
    "inputSummary",
    "saveInputBtn",
    "classClass",
    "classAssessment",
    "classTitle",
    "classSummary",
    "classHead",
    "classRows",
    "printClassBtn",
    "subjectAssessment",
    "subjectClass",
    "subjectSubject",
    "subjectTitle",
    "subjectSummary",
    "subjectRows",
    "gradeChart",
    "printSubjectBtn",
    "individualStream",
    "individualAssessment",
    "individualTitle",
    "individualSummary",
    "individualHead",
    "individualRows",
    "printIndividualBtn",
    "targetStream",
    "targetSubject",
    "targetHead",
    "targetRows",
    "targetTitle",
    "fillTargetsBtn",
    "printTargetBtn",
    "finalStream",
    "finalTitle",
    "finalSummary",
    "finalHead",
    "finalRows",
    "printFinalBtn",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function wireEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  [
    "inputClass",
    "inputSubject",
    "inputAssessment",
    "classClass",
    "classAssessment",
    "subjectAssessment",
    "subjectClass",
    "subjectSubject",
    "individualStream",
    "individualAssessment",
    "targetStream",
    "targetSubject",
    "finalStream",
  ].forEach((id) => els[id].addEventListener("change", renderAll));

  els.inputAssessment.addEventListener("change", () => {
    populateInputSubjectSelect();
    renderAll();
  });
  els.subjectAssessment.addEventListener("change", () => {
    populateSubjectAnalysisSubjectSelect();
    renderAll();
  });

  els.reloadDataBtn.addEventListener("click", () => loadStudents(true));
  els.saveInputBtn.addEventListener("click", () => {
    persistRecords();
    flashSave("Disimpan.");
  });
  els.exportBtn.addEventListener("click", exportData);
  els.importInput.addEventListener("change", importData);
  els.printClassBtn.addEventListener("click", () => window.print());
  els.printSubjectBtn.addEventListener("click", () => window.print());
  els.printIndividualBtn.addEventListener("click", () => window.print());
  els.printTargetBtn.addEventListener("click", () => window.print());
  els.printFinalBtn.addEventListener("click", () => window.print());
  els.fillTargetsBtn.addEventListener("click", fillTargetsFromGrades);
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function populateStaticSelects() {
  populateInputSubjectSelect();
  populateSubjectAnalysisSubjectSelect();
  fillSelect(els.targetSubject, subjects, subjectText);
  fillSelect(els.individualStream, streams, (item) => item.label);
  fillSelect(els.targetStream, finalStreams, (item) => item.label);
  fillSelect(els.finalStream, finalStreams, (item) => item.label);
  fillSelect(els.inputAssessment, assessments, (item) => item.label);
  fillSelect(els.classAssessment, assessments, (item) => item.label);
  fillSelect(els.subjectAssessment, assessments, (item) => item.label);
  fillSelect(els.individualAssessment, assessments, (item) => item.label);
}

function populateInputSubjectSelect() {
  fillSelect(els.inputSubject, assessmentSubjects(els.inputAssessment.value), subjectText);
}

function populateSubjectAnalysisSubjectSelect() {
  fillSelect(els.subjectSubject, assessmentSubjects(els.subjectAssessment.value), subjectText);
}

async function loadStudents(forceRemote = false) {
  els.dataStatus.textContent = "Memuatkan data murid...";
  let csv = "";
  let source = "Google Sheet";
  try {
    csv = await fetchText(CSV_URL);
  } catch (error) {
    if (forceRemote) {
      els.dataStatus.textContent = "CSV Google Sheet tidak dapat dimuat. Menggunakan salinan tempatan.";
    }
    source = "salinan tempatan";
    csv = await fetchText("students.csv");
  }

  state.students = normalizeStudents(parseCsv(csv));
  populateClassSelects();
  renderAll();
  els.dataStatus.textContent = `${state.students.length} murid dimuatkan daripada ${source}.`;
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Gagal memuat ${url}`);
  return response.text();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows.shift().map((header) => cleanText(header).toUpperCase());
  const classIndex = headers.indexOf("KELAS");
  const nameIndex = headers.indexOf("MURID");

  return rows
    .map((items) => ({
      className: cleanClass(items[classIndex] || ""),
      name: cleanText(items[nameIndex] || ""),
    }))
    .filter((student) => student.className && student.name);
}

function normalizeStudents(students) {
  const seen = new Set();
  return students
    .map((student) => ({
      className: student.className,
      name: student.name.toUpperCase(),
      id: `${student.className}::${student.name.toUpperCase()}`,
    }))
    .filter((student) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    })
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanClass(value) {
  return cleanText(value).replace(/\s+/g, "").toUpperCase();
}

function populateClassSelects() {
  const classes = getClasses().map((className) => ({ id: className, label: className }));
  [
    els.inputClass,
    els.classClass,
    els.subjectClass,
  ].forEach((select) => fillSelect(select, classes, (item) => item.label));
}

function fillSelect(select, items, labeler) {
  const previous = select.value;
  select.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labeler(item);
    select.appendChild(option);
  });
  if (items.some((item) => item.id === previous)) {
    select.value = previous;
  }
}

function renderAll() {
  renderInput();
  renderClassAnalysis();
  renderSubjectAnalysis();
  renderIndividual();
  renderTargets();
  renderFinalResults();
}

function renderInput() {
  const className = els.inputClass.value;
  const subjectId = els.inputSubject.value;
  const assessmentId = els.inputAssessment.value;
  const rows = studentsByClass(className);

  els.inputRows.innerHTML = rows
    .map((student, index) => {
      const grade = getGrade(student.id, assessmentId, subjectId);
      return `
        <tr>
          <td class="number-cell">${index + 1}</td>
          <td class="name-cell">${escapeHtml(student.name)}</td>
          <td>${gradeSelectHtml(grade, `data-student="${escapeHtml(student.id)}"` )}</td>
          <td class="number-cell">${formatPoint(gradeToPoint(grade))}</td>
        </tr>`;
    })
    .join("");

  els.inputRows.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      setGrade(select.dataset.student, assessmentId, subjectId, select.value);
      renderAll();
      persistRecords();
      flashSave("Disimpan automatik.");
    });
  });

  const stats = subjectStats(className, assessmentId, subjectId);
  renderMetrics(els.inputSummary, [
    ["Bil. Murid", rows.length],
    ["Gred Diisi", stats.graded],
    ["Lulus C Ke Atas", `${stats.passPercent}%`],
    ["Purata Subjek", stats.average || "-"],
  ]);
}

function renderClassAnalysis() {
  const className = els.classClass.value;
  const assessmentId = els.classAssessment.value;
  const assessment = findById(assessments, assessmentId);
  const visibleSubjects = assessmentSubjects(assessmentId);
  const rows = studentsByClass(className)
    .map((student) => ({ student, pngk: studentPngk(student.id, assessmentId) }))
    .sort((a, b) => (b.pngk.value ?? -1) - (a.pngk.value ?? -1) || a.student.name.localeCompare(b.student.name));

  els.classTitle.textContent = `Keputusan Peperiksaan ${assessment.label} 2026 - ${className}`;
  els.classHead.innerHTML = `
    <tr>
      <th>Bil.</th>
      <th>Nama</th>
      ${visibleSubjects.map((subject) => `<th>${subject.short}</th>`).join("")}
      <th>PNGK</th>
    </tr>`;
  els.classRows.innerHTML = rows
    .map(({ student, pngk }, index) => {
      const grades = visibleSubjects
        .map((subject) => `<td class="number-cell">${getGrade(student.id, assessmentId, subject.id) || ""}</td>`)
        .join("");
      return `
        <tr>
          <td class="number-cell">${index + 1}</td>
          <td class="name-cell">${escapeHtml(student.name)}</td>
          ${grades}
          <td class="number-cell">${pngk.text}</td>
        </tr>`;
    })
    .join("");

  const validPngk = rows.map((row) => row.pngk.value).filter((value) => value !== null);
  const averagePngk = average(validPngk);
  const complete = rows.filter((row) => row.pngk.count === visibleSubjects.length).length;
  renderMetrics(els.classSummary, [
    ["Bil. Murid", rows.length],
    ["Ada Rekod", validPngk.length],
    ["Lengkap Semua Subjek", complete],
    ["PNGK Kelas", averagePngk === null ? "-" : averagePngk.toFixed(2)],
    ["Pentaksiran", assessment.label],
  ]);
}

function renderSubjectAnalysis() {
  const className = els.subjectClass.value;
  const assessmentId = els.subjectAssessment.value;
  const subjectId = els.subjectSubject.value;
  const assessment = findById(assessments, assessmentId);
  const subject = findById(subjects, subjectId);
  const stats = subjectStats(className, assessmentId, subjectId);

  els.subjectTitle.textContent = `Analisis ${subject.label} ${assessment.label} - ${className}`;
  renderMetrics(els.subjectSummary, [
    ["Bil. Murid", stats.total],
    ["Gred Diisi", stats.graded],
    ["Peratus Lulus", `${stats.passPercent}%`],
    ["Peratus Cemerlang", `${stats.excellentPercent}%`],
    ["Peratus Gagal", `${stats.failPercent}%`],
    ["Lulus Sebahagian", `${stats.partialPercent}%`],
    ["Purata Subjek", stats.average || "-"],
    ["Gred Mod", stats.mode || "-"],
  ]);

  els.subjectRows.innerHTML = gradeScale
    .filter((item) => item.grade)
    .map((item) => {
      const count = stats.counts[item.grade] || 0;
      const contribution = stats.total ? ((count * item.point) / stats.total).toFixed(2) : "0.00";
      return `
        <tr>
          <td class="number-cell">${item.grade}</td>
          <td>${count}</td>
          <td>${item.point.toFixed(2)}</td>
          <td>${contribution}</td>
        </tr>`;
    })
    .join("");

  renderChart(stats.counts);
}

function renderIndividual() {
  const stream = findById(streams, els.individualStream.value);
  const assessmentId = els.individualAssessment.value;
  const assessment = findById(assessments, assessmentId);
  const visibleSubjects = assessmentSubjects(assessmentId);
  const rows = studentsByStream(stream.id)
    .map((student) => ({ student, pngk: studentPngk(student.id, assessmentId) }))
    .sort((a, b) => {
      const classSort = a.student.className.localeCompare(b.student.className);
      if (classSort !== 0) return classSort;
      return a.student.name.localeCompare(b.student.name);
    });

  els.individualTitle.textContent = `Analisis Individu ${stream.label} - ${assessment.label}`;
  els.individualHead.innerHTML = `
    <tr>
      <th>Bil.</th>
      <th>Kelas</th>
      <th>Nama Murid</th>
      ${visibleSubjects.map((subject) => `<th>${subject.short}</th>`).join("")}
      <th>PNGK</th>
    </tr>`;

  if (!rows.length) {
    renderMetrics(els.individualSummary, [
      ["Aliran", stream.label],
      ["Pentaksiran", assessment.label],
      ["Bil. Murid", 0],
      ["Ada Rekod", 0],
      ["PNGK Aliran", "-"],
    ]);
    els.individualRows.innerHTML = emptyRow(visibleSubjects.length + 4);
    return;
  }

  const validPngk = rows.map((row) => row.pngk.value).filter((value) => value !== null);
  const averagePngk = average(validPngk);
  const complete = rows.filter((row) => row.pngk.count === visibleSubjects.length).length;
  renderMetrics(els.individualSummary, [
    ["Aliran", stream.label],
    ["Pentaksiran", assessment.label],
    ["Bil. Murid", rows.length],
    ["Ada Rekod", validPngk.length],
    ["Lengkap Semua Subjek", complete],
    ["PNGK Aliran", averagePngk === null ? "-" : averagePngk.toFixed(2)],
  ]);

  els.individualRows.innerHTML = rows
    .map(({ student, pngk }, index) => {
      const grades = visibleSubjects
        .map((subject) => `<td class="number-cell">${getGrade(student.id, assessmentId, subject.id) || ""}</td>`)
        .join("");
      return `
        <tr>
          <td class="number-cell">${index + 1}</td>
          <td class="number-cell">${student.className}</td>
          <td class="name-cell">${escapeHtml(student.name)}</td>
          ${grades}
          <td class="number-cell">${pngk.text}</td>
        </tr>`;
    })
    .join("");
}

function renderTargets() {
  const stream = findById(finalStreams, els.targetStream.value);
  const subjectId = els.targetSubject.value;
  const subject = findById(subjects, subjectId);
  const rows = studentsByStream(stream.id);
  const hasCoursework = Boolean(subject.hasCoursework);

  els.targetTitle.textContent = `Sasaran STPM - ${subject.label} (${stream.label})`;
  els.targetHead.innerHTML = `
    <tr>
      <th>Bil.</th>
      <th>Kelas</th>
      <th>Nama Murid</th>
      <th>S1</th>
      <th>UL 1</th>
      <th>S2</th>
      <th>UL 2</th>
      <th>S3</th>
      ${hasCoursework ? "<th>KK</th>" : ""}
      <th>GP</th>
    </tr>`;
  els.targetRows.innerHTML = rows
    .map((student, index) => {
      const target = getTarget(student.id, subjectId);
      const gp = targetGp(target, subjectId);
      return `
        <tr>
          <td class="number-cell">${index + 1}</td>
          <td class="number-cell">${student.className}</td>
          <td class="name-cell">${escapeHtml(student.name)}</td>
          <td>${gradeSelectHtml(target.sem1 || "", `data-student="${escapeHtml(student.id)}" data-slot="sem1"` )}</td>
          <td>${gradeSelectHtml(target.ul1 || "", `data-student="${escapeHtml(student.id)}" data-slot="ul1"` )}</td>
          <td>${gradeSelectHtml(target.sem2 || "", `data-student="${escapeHtml(student.id)}" data-slot="sem2"` )}</td>
          <td>${gradeSelectHtml(target.ul2 || "", `data-student="${escapeHtml(student.id)}" data-slot="ul2"` )}</td>
          <td>${gradeSelectHtml(target.sem3 || "", `data-student="${escapeHtml(student.id)}" data-slot="sem3"` )}</td>
          ${hasCoursework ? `<td>${gradeSelectHtml(target.kk || "", `data-student="${escapeHtml(student.id)}" data-slot="kk"` )}</td>` : ""}
          <td class="number-cell">${gp === null ? "-" : gp.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  els.targetRows.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const current = getTarget(select.dataset.student, subjectId);
      current[select.dataset.slot] = select.value;
      setTarget(select.dataset.student, subjectId, current);
      renderTargets();
      persistTargets();
      flashSave("Sasaran disimpan.");
    });
  });
}

function renderFinalResults() {
  const stream = findById(finalStreams, els.finalStream.value);
  const rows = studentsByStream(stream.id)
    .map((student) => {
      const subjectGps = Object.fromEntries(
        subjects.map((subject) => [subject.id, targetGp(getTarget(student.id, subject.id), subject.id)])
      );
      const pngk = average(Object.values(subjectGps).filter((value) => value !== null));
      return { student, subjectGps, pngk };
    })
    .sort((a, b) => (b.pngk ?? -1) - (a.pngk ?? -1) || a.student.name.localeCompare(b.student.name));

  els.finalTitle.textContent = `Keputusan Akhir - ${stream.label}`;
  els.finalHead.innerHTML = `
    <tr>
      <th>Kedudukan</th>
      <th>Kelas</th>
      <th>Nama Murid</th>
      ${subjects.map((subject) => `<th>${subject.short}</th>`).join("")}
      <th>PNGK</th>
    </tr>`;

  const validPngk = rows.map((row) => row.pngk).filter((value) => value !== null);
  renderMetrics(els.finalSummary, [
    ["Aliran", stream.label],
    ["Bil. Murid", rows.length],
    ["Ada PNGK", validPngk.length],
    ["PNGK Tertinggi", validPngk.length ? Math.max(...validPngk).toFixed(2) : "-"],
    ["PNGK Purata", average(validPngk) === null ? "-" : average(validPngk).toFixed(2)],
  ]);

  els.finalRows.innerHTML = rows
    .map(({ student, subjectGps, pngk }, index) => {
      const subjectCells = subjects
        .map((subject) => `<td class="number-cell">${subjectGps[subject.id] === null ? "-" : subjectGps[subject.id].toFixed(2)}</td>`)
        .join("");
      return `
        <tr>
          <td class="number-cell">${pngk === null ? "-" : index + 1}</td>
          <td class="number-cell">${student.className}</td>
          <td class="name-cell">${escapeHtml(student.name)}</td>
          ${subjectCells}
          <td class="number-cell">${pngk === null ? "-" : pngk.toFixed(2)}</td>
        </tr>`;
    })
    .join("");
}

function renderChart(counts) {
  const max = Math.max(1, ...Object.values(counts));
  els.gradeChart.innerHTML = gradeScale
    .filter((item) => item.grade)
    .map((item) => {
      const count = counts[item.grade] || 0;
      const height = Math.max(3, Math.round((count / max) * 120));
      return `
        <div class="bar-item">
          <div class="bar" style="height:${height}px"></div>
          <div class="bar-label">${item.grade}</div>
          <div class="bar-count">${count}</div>
        </div>`;
    })
    .join("");
}

function subjectStats(className, assessmentId, subjectId) {
  const rows = studentsByClass(className);
  const counts = Object.fromEntries(gradeScale.filter((item) => item.grade).map((item) => [item.grade, 0]));
  let graded = 0;
  let totalPoint = 0;

  rows.forEach((student) => {
    const grade = getGrade(student.id, assessmentId, subjectId);
    const point = gradeToPoint(grade);
    if (point !== null) {
      counts[grade] += 1;
      graded += 1;
      totalPoint += point;
    }
  });

  const pass = countGrades(counts, ["A", "A-", "B+", "B", "B-", "C+", "C"]);
  const excellent = countGrades(counts, ["A", "A-", "B+"]);
  const partial = countGrades(counts, ["C-", "D+", "D"]);
  const fail = counts.F || 0;
  const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return {
    total: rows.length,
    graded,
    counts,
    average: graded ? (totalPoint / graded).toFixed(2) : "",
    passPercent: percent(pass, rows.length),
    excellentPercent: percent(excellent, rows.length),
    partialPercent: percent(partial, rows.length),
    failPercent: percent(fail, rows.length),
    mode: mode && mode[1] > 0 ? mode[0] : "",
  };
}

function fillTargetsFromGrades() {
  const stream = findById(finalStreams, els.targetStream.value);
  const subjectId = els.targetSubject.value;
  const subject = findById(subjects, subjectId);
  studentsByStream(stream.id).forEach((student) => {
    const target = getTarget(student.id, subjectId);
    assessments.forEach((assessment) => {
      const grade = getGrade(student.id, assessment.id, subjectId);
      if (grade) target[assessment.id] = grade;
    });
    if (subject.hasCoursework) {
      const kkGrade = getGrade(student.id, "sem3", `kk_${subjectId}`);
      if (kkGrade) target.kk = kkGrade;
    }
    setTarget(student.id, subjectId, target);
  });
  persistTargets();
  renderTargets();
  flashSave("Sasaran diisi daripada gred sedia ada.");
}

function studentPngk(studentId, assessmentId) {
  const points = assessmentSubjects(assessmentId)
    .map((subject) => gradeToPoint(getGrade(studentId, assessmentId, subject.id)))
    .filter((point) => point !== null);
  const value = average(points);
  return {
    value,
    count: points.length,
    text: value === null ? "" : value.toFixed(2),
  };
}

function classRank(studentId, className, assessmentId) {
  const ranked = studentsByClass(className)
    .map((student) => ({
      id: student.id,
      pngk: studentPngk(student.id, assessmentId).value,
    }))
    .filter((item) => item.pngk !== null)
    .sort((a, b) => b.pngk - a.pngk);
  const index = ranked.findIndex((item) => item.id === studentId);
  return index === -1 ? "-" : `${index + 1} / ${ranked.length}`;
}

function targetGp(target, subjectId) {
  const subject = findById(subjects, subjectId);
  const s1 = bestPoint(target.sem1, target.ul1);
  const s2 = bestPoint(target.sem2, target.ul2);
  const s3 = gradeToPoint(target.sem3);
  if (s1 === null || s2 === null || s3 === null) return null;

  if (!subject.hasCoursework) {
    return (s1 + s2 + s3) / 3;
  }

  const kk = gradeToPoint(target.kk);
  if (kk === null) return null;
  return s1 * weights.sem1 + s2 * weights.sem2 + s3 * weights.sem3 + kk * weights.kk;
}

function getGrade(studentId, assessmentId, subjectId) {
  return state.records?.[studentId]?.[assessmentId]?.[subjectId] || "";
}

function setGrade(studentId, assessmentId, subjectId, grade) {
  state.records[studentId] ||= {};
  state.records[studentId][assessmentId] ||= {};
  if (grade) state.records[studentId][assessmentId][subjectId] = grade;
  else delete state.records[studentId][assessmentId][subjectId];
}

function getTarget(studentId, subjectId) {
  return { ...(state.targets?.[studentId]?.[subjectId] || {}) };
}

function setTarget(studentId, subjectId, target) {
  state.targets[studentId] ||= {};
  state.targets[studentId][subjectId] = target;
}

function gradeToPoint(grade) {
  const normalized = String(grade || "").replace("−", "-");
  const item = gradeScale.find((entry) => entry.grade === normalized);
  return item ? item.point : null;
}

function gradeSelectHtml(value, attrs) {
  return `
    <select class="grade-select" ${attrs}>
      ${gradeScale
        .map((item) => `<option value="${item.grade}" ${item.grade === value ? "selected" : ""}>${item.grade || "-"}</option>`)
        .join("")}
    </select>`;
}

function renderMetrics(container, items) {
  container.innerHTML = items
    .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function getClasses() {
  return [...new Set(state.students.map((student) => student.className))].sort();
}

function studentsByClass(className) {
  return state.students.filter((student) => student.className === className);
}

function studentsByStream(streamId) {
  const stream = findById([...streams, ...finalStreams], streamId);
  return state.students.filter((student) => student.className.startsWith(stream.prefix));
}

function subjectText(subject) {
  return subject.code ? `${subject.label} (${subject.code})` : subject.label;
}

function assessmentSubjects(assessmentId) {
  return assessmentId === "sem3" ? [...subjects, ...courseworkSubjects] : subjects;
}

function bestPoint(primaryGrade, repeatGrade) {
  const points = [gradeToPoint(primaryGrade), gradeToPoint(repeatGrade)].filter((point) => point !== null);
  return points.length ? Math.max(...points) : null;
}

function findById(items, id) {
  return items.find((item) => item.id === id) || items[0];
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countGrades(counts, grades) {
  return grades.reduce((sum, grade) => sum + (counts[grade] || 0), 0);
}

function percent(count, total) {
  return total ? ((count / total) * 100).toFixed(1) : "0.0";
}

function formatPoint(point) {
  return point === null ? "-" : point.toFixed(2);
}

function emptyRow(colspan) {
  return `<tr><td class="empty-row" colspan="${colspan}">Tiada data.</td></tr>`;
}

function persistRecords() {
  saveJson(STORAGE_KEY, state.records);
}

function persistTargets() {
  saveJson(TARGET_KEY, state.targets);
}

function loadJson(key, fallback) {
  try {
    const stored = readStorage(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  const serialized = JSON.stringify(value);
  memoryStore[key] = serialized;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    }
  } catch {
    // Some embedded preview browsers disable persistent storage.
  }
}

function readStorage(key) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key) || memoryStore[key];
    }
  } catch {
    return memoryStore[key];
  }
  return memoryStore[key];
}

function flashSave(message) {
  els.saveStatus.textContent = message;
  window.clearTimeout(flashSave.timer);
  flashSave.timer = window.setTimeout(() => {
    els.saveStatus.textContent = "Data gred disimpan automatik.";
  }, 1800);
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    records: state.records,
    targets: state.targets,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "data-analisis-stpm.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      state.records = payload.records || {};
      state.targets = payload.targets || {};
      persistRecords();
      persistTargets();
      renderAll();
      flashSave("Data import selesai.");
    } catch {
      alert("Fail JSON tidak sah.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
