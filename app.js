(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector("#theme-toggle");
  const themeLabel = document.querySelector("#theme-label");

  function applyTheme(theme, savePreference = true) {
    const selectedTheme = theme === "dark" ? "dark" : "light";
    const isDark = selectedTheme === "dark";

    root.dataset.theme = selectedTheme;

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
    }

    if (themeLabel) {
      themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
    }

    if (savePreference) {
      try {
        window.localStorage.setItem("careguide-theme", selectedTheme);
      } catch (_error) {
        // The theme still changes if this browser blocks local storage.
      }
    }
  }

  let savedTheme = null;
  try {
    savedTheme = window.localStorage.getItem("careguide-theme");
  } catch (_error) {
    // Use the system theme if local storage is unavailable.
  }

  applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : "dark", false);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  const appViews = Array.from(document.querySelectorAll("[data-app-view]"));
  const routeLinks = Array.from(document.querySelectorAll("[data-view-target]"));
  const navigationLinks = Array.from(document.querySelectorAll(".primary-nav [data-view-target]"));
  const pageHeading = document.querySelector("#page-heading");
  const overviewSummaryStatus = document.querySelector("#overview-summary-status");
  const overviewAppointmentStatus = document.querySelector("#overview-appointment-status");
  const overviewWellnessStatus = document.querySelector("#overview-wellness-status");

  const viewRoutes = [
    { id: "overview", hash: "#overview", title: "Overview" },
    { id: "visit", hash: "#visit-prep", title: "Prepare for a Visit" },
    { id: "emergency", hash: "#urgent-care", title: "Emergency Guidance" },
    { id: "summary", hash: "#summary-panel", title: "Visit Summary" },
    { id: "report", hash: "#medical-report-explainer", title: "Medical Report Explainer" },
    { id: "doctor-finder", hash: "#doctor-finder", title: "Doctor Finder" },
    { id: "appointment", hash: "#appointment-planner", title: "Appointment Planner" },
    { id: "wellness", hash: "#wellness-planner", title: "Wellness Check-in" }
  ];
  const routeById = new Map(viewRoutes.map((route) => [route.id, route]));
  const routeByHash = new Map(viewRoutes.map((route) => [route.hash, route]));
  routeByHash.set("#top", routeById.get("overview"));
  let activeView = null;
  let stopVisitVoiceRecognition = null;

  function showView(viewId, { updateHistory = false, focusHeading = false } = {}) {
    const route = routeById.get(viewId);
    if (!route) return;

    if (activeView === "visit" && route.id !== "visit") stopVisitVoiceRecognition?.();

    if (updateHistory && window.location && window.location.hash !== route.hash) {
      try {
        window.history.pushState({ careGuideView: route.id }, "", route.hash);
      } catch (_error) {
        // Hash navigation remains available when History API is restricted (for example, file URLs).
        window.location.hash = route.hash;
      }
    }

    activeView = route.id;
    appViews.forEach((view) => {
      const isVisible = view.dataset.appView === activeView;
      view.hidden = !isVisible;
      view.inert = !isVisible;
      view.setAttribute("aria-hidden", String(!isVisible));
    });

    navigationLinks.forEach((link) => {
      const isCurrent = link.dataset.viewTarget === activeView;
      link.classList.toggle("is-active", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (pageHeading) pageHeading.textContent = route.title;
    document.title = `${route.title} | CareGuide AI`;

    if (focusHeading) {
      if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
      pageHeading?.focus({ preventScroll: true });
    }
  }

  function showViewFromHash() {
    const currentHash = window.location?.hash || "";
    const route = routeByHash.get(currentHash) || (currentHash === "" ? routeById.get("overview") : null);
    if (route) showView(route.id);
  }

  routeLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented || (event.button !== undefined && event.button !== 0) ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      ) return;

      const route = routeById.get(link.dataset.viewTarget);
      if (!route) return;
      event.preventDefault();
      showView(route.id, { updateHistory: true, focusHeading: true });
    });
  });

  window.addEventListener("hashchange", showViewFromHash);
  window.addEventListener("popstate", showViewFromHash);

  const initialRoute = routeByHash.get(window.location?.hash || "") || routeById.get("overview");
  showView(initialRoute.id);

  const form = document.querySelector("#concern-form");
  const concernInput = document.querySelector("#concern");
  const durationInput = document.querySelector("#duration");
  const severityInput = document.querySelector("#severity");
  const urgentInput = document.querySelector("#urgent-check");
  const urgentAlert = document.querySelector("#urgent-alert");
  const summaryEmpty = document.querySelector("#summary-empty");
  const summaryResult = document.querySelector("#summary-result");
  const summaryText = document.querySelector("#summary-text");
  const copyButton = document.querySelector("#copy-button");
  const downloadSummaryButton = document.querySelector("#download-summary-button");
  const printSummaryButton = document.querySelector("#print-summary-button");
  const copyStatus = document.querySelector("#copy-status");
  const formStatus = document.querySelector("#form-status");
  const clearButton = document.querySelector("#clear-button");
  const voiceToggle = document.querySelector("#concern-voice-toggle");
  const voiceToggleLabel = document.querySelector("#concern-voice-toggle-label");
  const voiceIndicator = document.querySelector("#concern-voice-indicator");
  const voiceIndicatorLabel = document.querySelector("#concern-voice-indicator-label");
  const voiceStatus = document.querySelector("#concern-voice-status");
  const appointmentForm = document.querySelector("#appointment-form");
  const appointmentClinic = document.querySelector("#appointment-clinic");
  const appointmentDate = document.querySelector("#appointment-date");
  const appointmentTime = document.querySelector("#appointment-time");
  const appointmentNotes = document.querySelector("#appointment-notes");
  const appointmentStatus = document.querySelector("#appointment-status");
  const appointmentStatusBadge = document.querySelector("#appointment-status-badge");
  const appointmentCountdown = document.querySelector("#appointment-countdown");
  const appointmentIcsButton = document.querySelector("#appointment-ics-button");
  const appointmentReset = document.querySelector("#appointment-reset");
  const appointmentQuestions = Array.from(document.querySelectorAll("[data-appointment-question]"));
  const wellnessHydration = document.querySelector("#wellness-hydration");
  const wellnessMovement = document.querySelector("#wellness-movement");
  const wellnessSleep = document.querySelector("#wellness-sleep");
  const personalWellnessGoalsList = document.querySelector("#personal-wellness-goals");
  const personalWellnessGoalsEmpty = document.querySelector("#personal-goals-empty");
  const addWellnessGoalButton = document.querySelector("#add-wellness-goal");
  const wellnessProgressBar = document.querySelector("#wellness-progressbar");
  const wellnessProgressCount = document.querySelector("#wellness-progress-count");
  const wellnessProgressPercent = document.querySelector("#wellness-progress-percent");
  const wellnessStatus = document.querySelector("#wellness-status");
  const wellnessReset = document.querySelector("#wellness-reset");
  const wellnessSaveToggle = document.querySelector("#wellness-save-toggle");
  const clearLocalWellnessButton = document.querySelector("#clear-local-wellness");
  const weeklyOverview = document.querySelector("#weekly-overview");
  const reportForm = document.querySelector("#report-explainer-form");
  const reportInput = document.querySelector("#report-text");
  const reportInputStatus = document.querySelector("#report-input-status");
  const clearReportInputButton = document.querySelector("#clear-report-input");
  const reportExplanation = document.querySelector("#report-explanation");
  const reportResults = document.querySelector("#report-results");
  const copyReportExplanationButton = document.querySelector("#copy-report-explanation");
  const reportCopyStatus = document.querySelector("#report-copy-status");
  const doctorFinderForm = document.querySelector("#doctor-finder-form");
  const doctorSpecialtyInput = document.querySelector("#doctor-specialty");
  const doctorLocationInput = document.querySelector("#doctor-location");
  const doctorSearchStatus = document.querySelector("#doctor-search-status");
  const doctorSearchClearButton = document.querySelector("#doctor-search-clear");
  const doctorSearchResults = document.querySelector("#doctor-search-results");
  const doctorSearchPreview = document.querySelector("#doctor-search-preview");
  const doctorGoogleLink = document.querySelector("#doctor-google-link");
  const doctorBingLink = document.querySelector("#doctor-bing-link");
  if (!form || !concernInput || !durationInput || !severityInput || !urgentInput) return;

  function updateUrgentNotice() {
    urgentAlert.hidden = !urgentInput.checked;
  }

  function resetSummary() {
    summaryText.textContent = "";
    summaryResult.hidden = true;
    summaryEmpty.hidden = false;
    copyButton.disabled = true;
    downloadSummaryButton.disabled = true;
    printSummaryButton.disabled = true;
    copyStatus.textContent = "";
    if (overviewSummaryStatus) overviewSummaryStatus.textContent = "No current summary";
  }

  function hasCurrentSummary() {
    return !summaryResult.hidden && Boolean(summaryText.textContent.trim());
  }

  function downloadTextFile(text, filename, mimeType = "text/plain;charset=utf-8") {
    const file = new Blob([text], { type: mimeType });
    const objectUrl = window.URL.createObjectURL(file);
    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    downloadLink.style.position = "fixed";
    downloadLink.style.left = "-10000px";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  }

  function invalidateSummary() {
    if (summaryResult.hidden) return;
    resetSummary();
    formStatus.textContent = "Your details changed. Create a new summary to update it.";
  }

  function buildSummary() {
    const concern = concernInput.value.trim();
    const duration = durationInput.value;
    const severity = severityInput.value;
    const urgentNote = urgentInput.checked
      ? "\n\nURGENT WARNING SIGN\nYou indicated a potentially urgent warning sign. Contact your local emergency services now if you may be in immediate danger."
      : "";

    return [
      "CARE CONVERSATION SUMMARY",
      "Prepared for a conversation with a healthcare professional",
      "",
      "1. MAIN CONCERN (AS DESCRIBED BY THE PERSON)",
      concern,
      "",
      "2. DURATION",
      duration,
      "",
      "3. INTENSITY (SELF-REPORTED)",
      severity,
      "",
      "4. QUESTIONS FOR THE HEALTHCARE PROFESSIONAL",
      "What details about timing, changes, or context would be helpful to share?",
      "What information should I note, and what next steps are appropriate for my situation?",
      urgentNote,
      "",
      "EDUCATIONAL DISCLAIMER",
      "Prepared with CareGuide AI, an educational prototype. This summary is based only on details entered by the user. It is not a diagnosis, treatment recommendation, or substitute for a clinician."
    ].join("\n");
  }

  // Speech recognition is optional and starts only after an explicit button press.
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voiceRecognition = null;
  let voiceSessionId = 0;
  let voiceState = "idle";

  function setVoiceStatus(message, state = "info") {
    if (!voiceStatus) return;
    voiceStatus.textContent = message;
    voiceStatus.dataset.state = state;
  }

  function setVoiceState(state) {
    voiceState = state;
    if (!voiceToggle) return;

    const isActive = state !== "idle";
    const label = state === "stopping" ? "Finishing…" : isActive ? "Stop listening" : "Start listening";
    if (voiceToggleLabel) voiceToggleLabel.textContent = label;
    voiceToggle.setAttribute("aria-pressed", String(isActive));
    voiceToggle.disabled = !SpeechRecognitionAPI || state === "stopping";

    if (voiceIndicator) voiceIndicator.hidden = !isActive;
    if (voiceIndicatorLabel) {
      voiceIndicatorLabel.textContent = state === "starting"
        ? "Starting microphone"
        : state === "stopping"
          ? "Finishing"
          : "Listening";
    }
  }

  function describeSpeechError(errorCode) {
    const messages = {
      "not-allowed": "Microphone or speech recognition permission was denied. Check this browser's permission settings, or type your concern instead.",
      "service-not-allowed": "Speech recognition is not allowed by this browser or its recognition service. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.",
      "audio-capture": "No usable microphone was found. Check your microphone or type your concern.",
      "no-speech": "No speech was recognized. Try again or type your concern.",
      "network": "Speech recognition may be unavailable in this browser or its recognition service could not be reached. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.",
      "language-not-supported": "Speech recognition does not support the selected browser language. You can still type your concern.",
      "language-unavailable": "Speech recognition is unavailable for the browser language. You can still type your concern."
    };
    return messages[errorCode] || "Speech recognition may be unavailable in this browser or its recognition service. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.";
  }

  function appendRecognizedText(transcript) {
    const spokenText = transcript.trim();
    if (!spokenText) return false;

    const currentText = concernInput.value;
    const separator = currentText && !/\s$/.test(currentText) ? " " : "";
    const addition = `${separator}${spokenText}`;
    const limit = concernInput.maxLength > 0 ? concernInput.maxLength : Number.MAX_SAFE_INTEGER;
    if (currentText.length + addition.length > limit) {
      setVoiceStatus("The concern field is at its 1,000 character limit. No speech text was added; edit the field to make room.", "error");
      return false;
    }

    concernInput.value = `${currentText}${addition}`;
    concernInput.setSelectionRange(concernInput.value.length, concernInput.value.length);
    concernInput.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function startVoiceRecognition() {
    if (!SpeechRecognitionAPI || !voiceToggle) {
      setVoiceStatus("Voice input is unavailable in this browser. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.", "error");
      return;
    }

    let recognition;
    try {
      recognition = new SpeechRecognitionAPI();
    } catch (_error) {
      setVoiceStatus("Speech recognition may be unavailable in this browser or its recognition service. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.", "error");
      return;
    }

    const sessionId = ++voiceSessionId;
    const seenResults = new Set();
    let receivedSpeech = false;
    let sessionHasStatus = false;
    voiceRecognition = recognition;
    setVoiceState("starting");
    setVoiceStatus("Requesting microphone access from your browser…");

    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (sessionId !== voiceSessionId) return;
      setVoiceState("listening");
      setVoiceStatus("Listening. Speak your concern, then press Stop listening or wait for recognition to finish.");
    };

    recognition.onresult = (event) => {
      if (sessionId !== voiceSessionId) return;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result.isFinal || seenResults.has(index)) continue;
        seenResults.add(index);
        const transcript = result[0]?.transcript || "";
        if (!transcript.trim()) continue;
        receivedSpeech = true;
        if (appendRecognizedText(transcript)) {
          setVoiceStatus("Recognized text was added. Review and edit it before creating your summary.", "success");
        } else {
          sessionHasStatus = true;
        }
      }
    };

    recognition.onerror = (event) => {
      if (sessionId !== voiceSessionId) return;
      sessionHasStatus = true;
      if (event.error === "aborted") {
        setVoiceStatus("Speech recognition was stopped. Your existing text was kept.");
      } else {
        setVoiceStatus(describeSpeechError(event.error), "error");
      }
      setVoiceState("idle");
      voiceRecognition = null;
    };

    recognition.onend = () => {
      if (sessionId !== voiceSessionId) return;
      setVoiceState("idle");
      voiceRecognition = null;
      if (!sessionHasStatus) {
        setVoiceStatus(receivedSpeech
          ? "Recognition finished. Review and edit the text before creating your summary."
          : "No speech was recognized. Try again or type your concern.", receivedSpeech ? "success" : "info");
      }
    };

    try {
      // start() is reached only from the user's microphone-button click.
      recognition.start();
    } catch (_error) {
      if (sessionId === voiceSessionId) {
        voiceRecognition = null;
        setVoiceState("idle");
        setVoiceStatus("Speech recognition may be unavailable in this browser or its recognition service. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.", "error");
      }
    }
  }

  function stopVoiceRecognition() {
    if (!voiceRecognition) return;
    const recognition = voiceRecognition;

    if (voiceState === "starting") {
      voiceSessionId += 1;
      voiceRecognition = null;
      try {
        recognition.abort();
      } catch (_error) {
        // The recognition session may already have ended.
      }
      setVoiceState("idle");
      setVoiceStatus("Listening was canceled. Your existing text was left unchanged.");
      return;
    }

    setVoiceState("stopping");
    setVoiceStatus("Finishing speech recognition…");
    try {
      recognition.stop();
    } catch (_error) {
      voiceSessionId += 1;
      voiceRecognition = null;
      setVoiceState("idle");
      setVoiceStatus("Listening stopped. Your existing text was kept.");
    }
  }

  stopVisitVoiceRecognition = stopVoiceRecognition;

  function cancelVoiceRecognitionForReset() {
    const wasActive = Boolean(voiceRecognition);
    if (wasActive) {
      voiceSessionId += 1;
      try {
        voiceRecognition.abort();
      } catch (_error) {
        // Ignore an already-ended session while continuing the form reset.
      }
      voiceRecognition = null;
    }
    setVoiceState("idle");
    setVoiceStatus(wasActive ? "Listening stopped because the form was reset." : "");
  }

  if (voiceToggle) {
    concernInput.setAttribute("aria-describedby", "concern-hint concern-voice-hint concern-voice-status");
    setVoiceState("idle");
    if (SpeechRecognitionAPI) {
      setVoiceStatus("Voice input is optional. Press Start listening to request microphone access.");
    } else {
      setVoiceStatus("Voice input is unavailable in this browser. You can still type your concern, or try a supported browser such as Google Chrome; availability is not guaranteed.", "error");
    }

    voiceToggle.addEventListener("click", () => {
      if (voiceState === "starting" || voiceState === "listening") {
        stopVoiceRecognition();
      } else if (voiceState === "idle") {
        startVoiceRecognition();
      }
    });
  }

  concernInput.addEventListener("input", () => {
    concernInput.setCustomValidity(
      concernInput.value.trim() ? "" : "Please enter a brief description of your concern."
    );
    invalidateSummary();
  });

  durationInput.addEventListener("change", invalidateSummary);
  severityInput.addEventListener("change", invalidateSummary);
  urgentInput.addEventListener("change", () => {
    updateUrgentNotice();
    invalidateSummary();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    concernInput.setCustomValidity(
      concernInput.value.trim() ? "" : "Please enter a brief description of your concern."
    );

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    summaryText.textContent = buildSummary();
    summaryEmpty.hidden = true;
    summaryResult.hidden = false;
    copyButton.disabled = false;
    downloadSummaryButton.disabled = false;
    printSummaryButton.disabled = false;
    copyStatus.textContent = "";
    formStatus.textContent = "Your visit-prep summary is ready.";
    if (overviewSummaryStatus) overviewSummaryStatus.textContent = "Summary ready";
  });

  clearButton.addEventListener("click", () => {
    cancelVoiceRecognitionForReset();
    form.reset();
    concernInput.setCustomValidity("");
    updateUrgentNotice();
    resetSummary();
    formStatus.textContent = "Your notes and summary have been cleared.";
    concernInput.focus();
  });

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const temporaryField = document.createElement("textarea");
    temporaryField.value = text;
    temporaryField.setAttribute("readonly", "");
    temporaryField.style.position = "fixed";
    temporaryField.style.top = "-1000px";
    temporaryField.style.opacity = "0";
    document.body.append(temporaryField);
    temporaryField.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      temporaryField.remove();
    }
    return copied;
  }

  copyButton.addEventListener("click", async () => {
    if (copyButton.disabled || !hasCurrentSummary()) return;

    try {
      const copied = await copyText(summaryText.textContent);
      copyStatus.textContent = copied
        ? "Copied to clipboard."
        : "Copy is unavailable here. Select the summary and press Ctrl+C.";
    } catch (_error) {
      copyStatus.textContent = "Copy is unavailable here. Select the summary and press Ctrl+C.";
    }
  });

  downloadSummaryButton.addEventListener("click", () => {
    if (downloadSummaryButton.disabled || !hasCurrentSummary()) return;

    try {
      downloadTextFile(summaryText.textContent, "CareGuide-visit-summary.txt");
      copyStatus.textContent = "Your visit summary was downloaded as a text file.";
    } catch (_error) {
      copyStatus.textContent = "Download unavailable here. Use Copy Summary instead.";
    }
  });

  printSummaryButton.addEventListener("click", () => {
    if (printSummaryButton.disabled || !hasCurrentSummary()) return;

    const finishPrint = () => {
      document.body.classList.remove("print-summary-only");
      window.removeEventListener("afterprint", finishPrint);
    };

    try {
      document.body.classList.add("print-summary-only");
      window.addEventListener("afterprint", finishPrint, { once: true });
      window.print();
      copyStatus.textContent = "Print view opened.";
    } catch (_error) {
      finishPrint();
      copyStatus.textContent = "Printing is unavailable in this browser.";
    }
  });

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getAppointmentDateTime() {
    if (!appointmentDate?.value || !appointmentTime?.value) return null;
    const [year, month, day] = appointmentDate.value.split("-").map(Number);
    const [hour, minute] = appointmentTime.value.split(":").map(Number);
    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

    const dateTime = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
      dateTime.getFullYear() !== year || dateTime.getMonth() !== month - 1 ||
      dateTime.getDate() !== day || dateTime.getHours() !== hour || dateTime.getMinutes() !== minute
    ) return null;
    return dateTime;
  }

  function setAppointmentStatus(message, state) {
    if (appointmentStatusBadge) {
      appointmentStatusBadge.dataset.state = state;
      appointmentStatusBadge.textContent = message;
    }
  }

  function formatRemaining(milliseconds) {
    const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (totalHours < 24) return minutes ? `${totalHours} hr ${minutes} min` : `${totalHours} hr`;
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return hours ? `${days} day${days === 1 ? "" : "s"} ${hours} hr` : `${days} day${days === 1 ? "" : "s"}`;
  }

  function validateAppointmentFields() {
    if (!appointmentForm || !appointmentDate || !appointmentTime || !appointmentClinic) return false;

    const now = new Date();
    const today = localDateString(now);
    appointmentDate.min = today;
    appointmentClinic.setCustomValidity(
      appointmentClinic.value.trim() ? "" : "Enter a clinic or healthcare professional name."
    );
    appointmentDate.setCustomValidity(
      appointmentDate.value && appointmentDate.value < today ? "This appointment date has passed." : ""
    );

    const dateTime = getAppointmentDateTime();
    const isPast = Boolean(dateTime && dateTime <= now);
    appointmentTime.setCustomValidity(
      isPast && appointmentDate.value === today ? "Choose a time later than now." : ""
    );

    if (!appointmentDate.value || !appointmentTime.value) {
      setAppointmentStatus("No appointment details", "empty");
      appointmentCountdown.textContent = "Enter a date and time to preview the appointment status.";
    } else if (!dateTime) {
      setAppointmentStatus("Check date and time", "invalid");
      appointmentCountdown.textContent = "Enter a valid date and time.";
    } else if (dateTime <= now) {
      setAppointmentStatus("Past", "past");
      appointmentCountdown.textContent = "This appointment time has passed. Downloads are disabled for past appointments.";
    } else if (appointmentDate.value === today) {
      setAppointmentStatus("Today", "today");
      appointmentCountdown.textContent = `Starts in ${formatRemaining(dateTime - now)} · local time`;
    } else {
      setAppointmentStatus("Upcoming", "upcoming");
      appointmentCountdown.textContent = `Starts in ${formatRemaining(dateTime - now)} · local time`;
    }

    if (overviewAppointmentStatus) {
      overviewAppointmentStatus.textContent = appointmentStatusBadge.dataset.state === "empty"
        ? "No appointment planned"
        : `${appointmentStatusBadge.textContent} · ${appointmentCountdown.textContent}`;
    }

    const canExport = appointmentForm.checkValidity() && Boolean(dateTime && dateTime > now);
    if (appointmentIcsButton) appointmentIcsButton.disabled = !canExport;
    return canExport;
  }

  function escapeICalendarText(value) {
    return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function buildAppointmentCalendarFile() {
    const dateTime = getAppointmentDateTime();
    if (!dateTime) return "";
    const datePart = appointmentDate.value.replace(/-/g, "");
    const timePart = appointmentTime.value.replace(":", "");
    const utcStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const clinic = escapeICalendarText(appointmentClinic.value.trim());
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CareGuide AI//Appointment planner//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@careguide.local`,
      `DTSTAMP:${utcStamp}`,
      `DTSTART:${datePart}T${timePart}00`,
      `SUMMARY:${escapeICalendarText(`Visit: ${appointmentClinic.value.trim()}`)}`,
      `LOCATION:${clinic}`,
      "DESCRIPTION:Added from CareGuide appointment planner. No appointment was booked and no reminders are set.",
      "END:VEVENT",
      "END:VCALENDAR",
      ""
    ].join("\r\n");
  }

  if (appointmentForm && appointmentDate && appointmentTime && appointmentClinic) {
    function refreshAppointmentPreview() {
      validateAppointmentFields();
    }

    [appointmentClinic, appointmentDate, appointmentTime].forEach((field) => {
      field.addEventListener("input", refreshAppointmentPreview);
      field.addEventListener("change", refreshAppointmentPreview);
    });

    appointmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateAppointmentFields()) {
        appointmentForm.reportValidity();
        return;
      }

      const lines = [
        "APPOINTMENT PLANNER NOTE",
        "",
        `Clinic or healthcare professional: ${appointmentClinic.value.trim()}`,
        `Date: ${appointmentDate.value}`,
        `Time: ${appointmentTime.value} (local time)`
      ];
      const selectedQuestions = appointmentQuestions.filter((checkbox) => checkbox.checked);
      if (selectedQuestions.length) {
        lines.push("", "Questions to bring:", ...selectedQuestions.map((checkbox) => `- ${checkbox.value}`));
      }
      if (appointmentNotes.value.trim()) {
        lines.push("", "Optional notes", appointmentNotes.value.trim());
      }
      lines.push("", "This planner does not book appointments, send reminders, or sync a calendar.");

      try {
        downloadTextFile(lines.join("\n"), "CareGuide-appointment-details.txt");
        appointmentStatus.textContent = "Appointment details downloaded. Nothing was booked or sent.";
      } catch (_error) {
        appointmentStatus.textContent = "Download unavailable here. Your details remain only in this page.";
      }
    });

    appointmentIcsButton.addEventListener("click", () => {
      if (appointmentIcsButton.disabled || !validateAppointmentFields()) return;
      try {
        downloadTextFile(buildAppointmentCalendarFile(), "CareGuide-appointment.ics", "text/calendar;charset=utf-8");
        appointmentStatus.textContent = "Calendar file downloaded. No booking, reminder, or sync was created.";
      } catch (_error) {
        appointmentStatus.textContent = "Calendar download unavailable in this browser.";
      }
    });

    appointmentReset.addEventListener("click", () => {
      appointmentForm.reset();
      appointmentClinic.setCustomValidity("");
      appointmentDate.setCustomValidity("");
      appointmentTime.setCustomValidity("");
      appointmentStatus.textContent = "Appointment details cleared.";
      refreshAppointmentPreview();
      appointmentClinic.focus();
    });

    refreshAppointmentPreview();
    window.setInterval(refreshAppointmentPreview, 60000);
  }

  const wellnessFixedChecks = [
    wellnessHydration,
    wellnessMovement,
    wellnessSleep
  ].filter(Boolean);

  const wellnessStorageKey = "careguide-wellness-v1";
  const wellnessConsentVersion = 1;
  const emptyWellnessHistory = () => ({ goals: [], day: localDateString(), checks: [], records: {} });
  let wellnessHistory = emptyWellnessHistory();
  let wellnessGoals = [];
  const pendingWellnessGoalIds = new Set();
  let fallbackGoalIdCounter = 0;

  function getWellnessGoalsWithText() {
    return wellnessGoals.filter((goal) => goal.text.trim());
  }

  function createWellnessGoalId() {
    let id = "";
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        id = `goal-${window.crypto.randomUUID()}`;
      }
    } catch (_error) {
      // Use the local fallback when secure random IDs are unavailable.
    }

    while (!id || wellnessGoals.some((goal) => goal.id === id)) {
      fallbackGoalIdCounter += 1;
      id = `goal-${Date.now().toString(36)}-${fallbackGoalIdCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return id;
  }

  function isValidDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }

  function readSavedWellness() {
    try {
      const storedValue = window.localStorage.getItem(wellnessStorageKey);
      if (!storedValue) return null;
      const stored = JSON.parse(storedValue);
      if (!stored || ![1, 2].includes(stored.version) || stored.consent !== true) return null;

      const goals = [];
      const seenGoalIds = new Set();
      if (stored.version === 2 && Array.isArray(stored.goals)) {
        stored.goals.forEach((goal) => {
          if (!goal || typeof goal.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(goal.id)) return;
          if (typeof goal.text !== "string" || !goal.text.trim() || seenGoalIds.has(goal.id)) return;
          seenGoalIds.add(goal.id);
          goals.push({
            id: goal.id,
            text: goal.text.trim().slice(0, 160),
            completed: goal.completed === true,
            persisted: true
          });
        });
      } else if (stored.version === 1 && typeof stored.goal === "string" && stored.goal.trim()) {
        // Migrate the original single goal and its fourth checklist value in place.
        goals.push({
          id: "legacy-personal-wellness-goal",
          text: stored.goal.trim().slice(0, 160),
          completed: Array.isArray(stored.checks) && stored.checks[3] === true,
          persisted: true
        });
      }

      const checks = Array.isArray(stored.checks) && stored.checks.length >= 3
        ? stored.checks.slice(0, 3).map((value) => value === true)
        : [false, false, false];
      const records = {};
      if (stored.records && typeof stored.records === "object" && !Array.isArray(stored.records)) {
        Object.entries(stored.records).forEach(([day, record]) => {
          if (!isValidDateKey(day)) return;
          if (Number.isInteger(record) && record >= 0 && record <= 4) {
            records[day] = { completed: record, total: 4 };
            return;
          }
          if (
            record && Number.isInteger(record.completed) && Number.isInteger(record.total) &&
            record.total > 0 && record.total <= 10000 && record.completed >= 0 && record.completed <= record.total
          ) {
            records[day] = { completed: record.completed, total: record.total };
          }
        });
      }
      return {
        goals,
        day: isValidDateKey(stored.day) ? stored.day : "",
        checks,
        records,
        explicitConsent: stored.consentVersion === wellnessConsentVersion
      };
    } catch (_error) {
      return null;
    }
  }

  function applyWellnessStateToForm() {
    const isToday = wellnessHistory.day === localDateString();
    wellnessFixedChecks.forEach((checkbox, index) => {
      checkbox.checked = isToday && wellnessHistory.checks[index] === true;
    });
    wellnessGoals = wellnessHistory.goals.map((goal) => ({
      ...goal,
      completed: isToday && goal.completed,
      persisted: true
    }));
    pendingWellnessGoalIds.clear();
    renderPersonalWellnessGoals();
  }

  function getWeekStart(date = new Date()) {
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysSinceMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday);
    return weekStart;
  }

  function renderWeeklyOverview() {
    if (!weeklyOverview) return;
    weeklyOverview.replaceChildren();

    if (!wellnessSaveToggle?.checked) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "weekly-empty";
      emptyMessage.textContent = "Opt in above to keep check-ins and see a weekly overview. Nothing is saved otherwise.";
      weeklyOverview.append(emptyMessage);
      return;
    }

    const weekStart = getWeekStart();
    const today = localDateString();
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach((dayName, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateKey = localDateString(date);
      const record = wellnessHistory.records[dateKey];
      const hasRecord = Boolean(record);
      const cell = document.createElement("div");
      cell.className = "weekly-day";
      if (dateKey === today) cell.classList.add("is-today");
      const dayLabel = document.createElement("span");
      dayLabel.className = "weekly-day-name";
      dayLabel.textContent = dayName;
      const score = document.createElement("strong");
      score.textContent = hasRecord ? `${record.completed}/${record.total}` : "—";
      const accessibleDate = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      cell.setAttribute("aria-label", `${dayName}, ${accessibleDate}: ${hasRecord ? `${record.completed} of ${record.total} check-ins` : "no check-in recorded"}`);
      cell.title = cell.getAttribute("aria-label");
      cell.append(dayLabel, score);
      weeklyOverview.append(cell);
    });
  }

  function saveWellnessIfConsented(announceSaved = true) {
    if (!wellnessSaveToggle?.checked) return;
    const goalsToSave = getWellnessGoalsWithText().map((goal) => ({
      id: goal.id,
      text: goal.text.trim(),
      completed: Boolean(goal.completed)
    }));
    const completed = wellnessFixedChecks.filter((checkbox) => checkbox.checked).length +
      goalsToSave.filter((goal) => goal.completed).length;
    const total = wellnessFixedChecks.length + goalsToSave.length;
    const today = localDateString();
    wellnessHistory.day = today;
    wellnessHistory.checks = wellnessFixedChecks.map((checkbox) => Boolean(checkbox.checked));
    wellnessHistory.goals = goalsToSave;
    wellnessHistory.records[today] = { completed, total };

    const weekStart = localDateString(getWeekStart());
    Object.keys(wellnessHistory.records).forEach((day) => {
      if (day < weekStart || day > today) delete wellnessHistory.records[day];
    });

    // Progress renders before this save path on checkbox changes, so refresh
    // the weekly card after its same-day record has been brought up to date.
    renderWeeklyOverview();

    try {
      window.localStorage.setItem(wellnessStorageKey, JSON.stringify({
        version: 2,
        consent: true,
        consentVersion: wellnessConsentVersion,
        goals: wellnessHistory.goals,
        day: wellnessHistory.day,
        checks: wellnessHistory.checks,
        records: wellnessHistory.records
      }));
      if (announceSaved) wellnessStatus.textContent = "Wellness goals and check-ins saved on this device.";
    } catch (_error) {
      wellnessStatus.textContent = "This browser could not save the latest wellness update. Your current edits remain available for this session.";
    }
  }

  function updateWellnessProgress() {
    const activeGoals = getWellnessGoalsWithText();
    const completed = wellnessFixedChecks.filter((checkbox) => checkbox.checked).length +
      activeGoals.filter((goal) => goal.completed).length;
    const total = wellnessFixedChecks.length + activeGoals.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const progressText = `${completed} of ${total} complete`;

    wellnessProgressCount.textContent = progressText;
    wellnessProgressPercent.textContent = `${percent}%`;
    wellnessProgressBar.style.setProperty("--wellness-progress", `${percent}%`);
    wellnessProgressBar.setAttribute("aria-valuemax", String(total));
    wellnessProgressBar.setAttribute("aria-valuenow", String(completed));
    wellnessProgressBar.setAttribute("aria-valuetext", progressText);
    if (overviewWellnessStatus) overviewWellnessStatus.textContent = `${progressText} today`;
    renderWeeklyOverview();
  }

  wellnessFixedChecks.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      updateWellnessProgress();
      saveWellnessIfConsented();
    });
  });

  function updateWellnessAddButton() {
    addWellnessGoalButton.disabled = pendingWellnessGoalIds.size > 0;
  }

  function renderPersonalWellnessGoals(focusGoalId = null, focusAddButton = false) {
    personalWellnessGoalsList.replaceChildren();
    let focusInput = null;

    wellnessGoals.forEach((goal, index) => {
      const goalNumber = index + 1;
      const inputId = `personal-wellness-goal-${goal.id}`;
      const doneId = `personal-wellness-goal-done-${goal.id}`;
      const row = document.createElement("div");
      row.className = "wellness-item personal-goal-item wellness-user-goal";
      row.setAttribute("role", "listitem");
      row.setAttribute("data-wellness-goal-id", goal.id);

      const goalCopy = document.createElement("div");
      goalCopy.className = "wellness-item-copy goal-copy";
      const inputLabel = document.createElement("label");
      inputLabel.setAttribute("for", inputId);
      inputLabel.textContent = `Personal goal ${goalNumber}`;

      const textInput = document.createElement("input");
      textInput.className = "field-control goal-input";
      textInput.id = inputId;
      textInput.type = "text";
      textInput.maxLength = 160;
      textInput.autocomplete = "off";
      textInput.placeholder = "A personal goal that feels right for you";
      textInput.value = goal.text;
      textInput.setAttribute("aria-describedby", "personal-goals-hint");
      goal.textInput = textInput;
      if (goal.id === focusGoalId) focusInput = textInput;

      textInput.addEventListener("input", () => {
        goal.text = textInput.value;
        const hasText = Boolean(goal.text.trim());
        if (hasText) {
          pendingWellnessGoalIds.delete(goal.id);
        } else {
          pendingWellnessGoalIds.add(goal.id);
          goal.completed = false;
        }
        if (goal.doneInput) {
          goal.doneInput.disabled = !hasText;
          if (!hasText) goal.doneInput.checked = false;
        }
        goal.doneInput?.setAttribute("aria-label", `Mark personal goal ${goalNumber} done`);
        goal.removeButton?.setAttribute("aria-label", `Remove personal goal ${goalNumber}`);
        updateWellnessAddButton();
        updateWellnessProgress();
        saveWellnessIfConsented(false);
      });

      textInput.addEventListener("change", () => {
        if (!goal.text.trim()) {
          removePersonalWellnessGoal(goal.id, { focusAddButton: true, announce: true });
          return;
        }
        pendingWellnessGoalIds.delete(goal.id);
        goal.persisted = true;
        updateWellnessAddButton();
        saveWellnessIfConsented();
      });

      textInput.addEventListener("blur", () => {
        if (!goal.text.trim() && wellnessGoals.some((item) => item.id === goal.id)) {
          removePersonalWellnessGoal(goal.id, { focusAddButton: true, announce: true });
        }
      });
      goalCopy.append(inputLabel, textInput);

      const doneLabel = document.createElement("label");
      doneLabel.className = "goal-complete-label";
      doneLabel.setAttribute("for", doneId);
      const doneCheckbox = document.createElement("input");
      doneCheckbox.id = doneId;
      doneCheckbox.type = "checkbox";
      doneCheckbox.checked = Boolean(goal.completed && goal.text.trim());
      doneCheckbox.disabled = !goal.text.trim();
      doneCheckbox.setAttribute("aria-label", `Mark personal goal ${goalNumber} done`);
      doneCheckbox.addEventListener("change", () => {
        if (!goal.text.trim()) {
          doneCheckbox.checked = false;
          return;
        }
        goal.completed = doneCheckbox.checked;
        goal.persisted = true;
        updateWellnessProgress();
        saveWellnessIfConsented();
      });
      goal.doneInput = doneCheckbox;
      const doneText = document.createElement("span");
      doneText.textContent = "Done";
      doneLabel.append(doneCheckbox, doneText);

      const removeButton = document.createElement("button");
      removeButton.className = "goal-remove-button";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove personal goal ${goalNumber}`);
      removeButton.addEventListener("click", () => {
        removePersonalWellnessGoal(goal.id, { focusAddButton: true, announce: true });
      });
      goal.removeButton = removeButton;

      row.append(goalCopy, doneLabel, removeButton);
      personalWellnessGoalsList.append(row);
    });

    personalWellnessGoalsEmpty.hidden = wellnessGoals.length > 0;
    updateWellnessAddButton();
    if (focusInput) focusInput.focus();
    else if (focusAddButton) {
      const pendingGoal = wellnessGoals.find((goal) => pendingWellnessGoalIds.has(goal.id));
      if (pendingGoal?.textInput) pendingGoal.textInput.focus();
      else if (!addWellnessGoalButton.disabled) addWellnessGoalButton.focus();
    }
  }

  function removePersonalWellnessGoal(goalId, { focusAddButton = false, announce = false } = {}) {
    const goal = wellnessGoals.find((item) => item.id === goalId);
    if (!goal) return;
    const shouldSave = Boolean(goal.persisted || goal.text.trim());
    wellnessGoals = wellnessGoals.filter((item) => item.id !== goalId);
    pendingWellnessGoalIds.delete(goalId);
    renderPersonalWellnessGoals(null, focusAddButton);
    updateWellnessProgress();
    if (shouldSave) saveWellnessIfConsented();
    if (announce) wellnessStatus.textContent = "Personal goal removed.";
  }

  addWellnessGoalButton.addEventListener("click", () => {
    if (addWellnessGoalButton.disabled || pendingWellnessGoalIds.size > 0) return;
    const goal = { id: createWellnessGoalId(), text: "", completed: false, persisted: false };
    wellnessGoals.push(goal);
    pendingWellnessGoalIds.add(goal.id);
    renderPersonalWellnessGoals(goal.id);
    saveWellnessIfConsented();
    wellnessStatus.textContent = "A goal field was added. Enter a non-empty goal; blank goals are discarded.";
  });

  const savedWellness = readSavedWellness();
  if (savedWellness) {
    wellnessHistory = savedWellness;
    wellnessSaveToggle.checked = savedWellness.explicitConsent;
    applyWellnessStateToForm();
  } else {
    renderPersonalWellnessGoals();
  }

  wellnessSaveToggle.addEventListener("change", () => {
    if (wellnessSaveToggle.checked) {
      wellnessStatus.textContent = "Wellness saving is on for this device only.";
      updateWellnessProgress();
      saveWellnessIfConsented();
    } else {
      try {
        window.localStorage.removeItem(wellnessStorageKey);
        wellnessStatus.textContent = "Saved wellness data was removed from this device. This session is not being saved.";
      } catch (_error) {
        wellnessStatus.textContent = "This browser could not access its saved wellness data.";
      }
      wellnessHistory.records = {};
      wellnessHistory.day = "";
      wellnessHistory.checks = [];
      renderWeeklyOverview();
    }
  });

  wellnessReset.addEventListener("click", () => {
    const goalsToRemove = getWellnessGoalsWithText().length;
    if (goalsToRemove > 1 && !window.confirm(`Reset the checklist and remove all ${goalsToRemove} personal goals?`)) return;
    wellnessFixedChecks.forEach((checkbox) => { checkbox.checked = false; });
    wellnessGoals = [];
    pendingWellnessGoalIds.clear();
    wellnessHistory.goals = [];
    renderPersonalWellnessGoals();
    updateWellnessProgress();
    saveWellnessIfConsented();
    wellnessStatus.textContent = goalsToRemove
      ? `Today’s checklist was reset and ${goalsToRemove} personal goal${goalsToRemove === 1 ? "" : "s"} removed.`
      : "Today’s checklist was reset.";
  });

  clearLocalWellnessButton.addEventListener("click", () => {
    if (!window.confirm("Clear saved wellness data and reset this checklist on this device?")) return;
    let storageWasCleared = true;
    try {
      window.localStorage.removeItem(wellnessStorageKey);
    } catch (_error) {
      storageWasCleared = false;
    }
    wellnessSaveToggle.checked = false;
    wellnessHistory = emptyWellnessHistory();
    wellnessFixedChecks.forEach((checkbox) => { checkbox.checked = false; });
    wellnessGoals = [];
    pendingWellnessGoalIds.clear();
    renderPersonalWellnessGoals();
    updateWellnessProgress();
    wellnessStatus.textContent = storageWasCleared
      ? "Saved wellness data and this checklist were cleared from the page."
      : "This checklist was cleared from the page, but browser storage blocked removal of saved data.";
  });

  updateWellnessProgress();
  let observedWellnessDay = localDateString();
  window.setInterval(() => {
    const currentDay = localDateString();
    if (currentDay === observedWellnessDay) return;
    observedWellnessDay = currentDay;
    wellnessFixedChecks.forEach((checkbox) => { checkbox.checked = false; });
    wellnessGoals.forEach((goal) => {
      goal.completed = false;
      if (goal.doneInput) goal.doneInput.checked = false;
    });
    wellnessHistory.day = currentDay;
    wellnessHistory.checks = wellnessFixedChecks.map(() => false);
    wellnessHistory.goals = wellnessGoals.filter((goal) => goal.text.trim()).map((goal) => ({
      id: goal.id,
      text: goal.text.trim(),
      completed: false
    }));
    wellnessHistory.records = Object.fromEntries(
      Object.entries(wellnessHistory.records).filter(([day]) => day >= localDateString(getWeekStart()) && day < currentDay)
    );
    updateWellnessProgress();
    wellnessStatus.textContent = "A new day started; today’s checklist is clear.";
  }, 60000);

  // A small local glossary provides short definitions only. It is not a
  // medical knowledge base and does not infer diagnoses or next steps.
  const reportTermNotes = new Map([
    ["hemoglobin", "A protein in red blood cells that carries oxygen."],
    ["hgb", "A protein in red blood cells that carries oxygen."],
    ["white blood cell count", "A count of white blood cells."],
    ["wbc", "A count of white blood cells."],
    ["platelet count", "A count of platelets, which are involved in clotting."],
    ["platelets", "A count of platelets, which are involved in clotting."],
    ["glucose", "A sugar measured in blood or other samples."],
    ["sodium", "An electrolyte measured in blood or other samples."],
    ["potassium", "An electrolyte measured in blood or other samples."],
    ["creatinine", "A substance measured in blood or urine tests."],
    ["cholesterol", "A lipid measured in blood tests."],
    ["total cholesterol", "A lipid measured in blood tests."],
    ["hdl cholesterol", "A cholesterol measure labeled HDL in the report."],
    ["ldl cholesterol", "A cholesterol measure labeled LDL in the report."],
    ["tsh", "Thyroid-stimulating hormone."],
    ["hba1c", "A form of hemoglobin measured in blood tests."],
    ["hemoglobin a1c", "A form of hemoglobin measured in blood tests."]
  ]);

  const reportUnitNotes = new Map([
    ["g/dl", "grams per deciliter"],
    ["mg/dl", "milligrams per deciliter"],
    ["mmol/l", "millimoles per liter"],
    ["meq/l", "milliequivalents per liter"],
    ["u/l", "units per liter"],
    ["iu/l", "international units per liter"],
    ["ng/ml", "nanograms per milliliter"],
    ["uiu/ml", "micro-international units per milliliter"],
    ["µiu/ml", "micro-international units per milliliter"],
    ["%", "percent"],
    ["fl", "femtoliters"],
    ["pg", "picograms"]
  ]);

  const reportRangeMarkerPattern = /(?:(?:reference|ref\.?)\s+(?:range|interval)|(?:normal|expected)\s+range|range)\s*[:=]?\s*/i;
  const reportRangePrefixPattern = /^(?:(?:reference|ref\.?)\s+(?:range|interval)|(?:normal|expected)\s+range|range)\s*[:=]?\s*/i;
  const reportNumberPattern = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
  const reportUnitPattern = "(?:10\\^9/L|[A-Za-zµμ%][A-Za-z0-9µμ%./^_-]*)";
  const reportValuePattern = new RegExp(`^(${reportNumberPattern})(?:\\s*(%))?(?:\\s+(${reportUnitPattern}))?\\s*$`, "u");
  const reportIntervalPattern = new RegExp(
    `^(${reportNumberPattern})(?:\\s*(%))?(?:\\s+(${reportUnitPattern}))?\\s*(?:to|[-–—])\\s*(${reportNumberPattern})(?:\\s*(%))?(?:\\s+(${reportUnitPattern}))?\\s*$`,
    "iu"
  );

  function normalizeReportTerm(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function normalizeReportUnit(value) {
    return value.trim().toLowerCase().replace(/μ/g, "µ");
  }

  function parseReportLine(line) {
    const labelMatch = line.match(/^([^:]{1,80}):\s*(.*?)\s*$/);
    if (!labelMatch) return null;

    const label = labelMatch[1].trim();
    if (!label || !/[A-Za-z]/.test(label)) return null;

    let resultText = labelMatch[2].trim();
    let rangeText = null;
    const bracketMatch = resultText.match(/^(.*?)\s*(?:\(([^()]*)\)|\[([^\[\]]*)\])\s*$/);

    if (bracketMatch) {
      resultText = bracketMatch[1].trim();
      rangeText = (bracketMatch[2] ?? bracketMatch[3] ?? "").trim();
    } else {
      const rangeMarker = resultText.match(reportRangeMarkerPattern);
      if (rangeMarker) {
        rangeText = resultText.slice(rangeMarker.index + rangeMarker[0].length).trim();
        resultText = resultText.slice(0, rangeMarker.index).trim().replace(/[;,]\s*$/, "");
      }
    }

    const entry = {
      label,
      resultText,
      rangeText,
      termNote: reportTermNotes.get(normalizeReportTerm(label)) || "",
      resultUnit: "",
      value: null,
      status: "unreadable-result",
      issue: "The result is not in the supported numeric format, so no comparison was made."
    };

    const valueMatch = resultText.match(reportValuePattern);
    if (!valueMatch) return entry;

    entry.valueText = valueMatch[1];
    entry.value = Number(valueMatch[1]);
    entry.resultUnit = valueMatch[2] || valueMatch[3] || "";
    if (!Number.isFinite(entry.value)) {
      entry.issue = "The numeric result could not be read safely, so no comparison was made.";
      return entry;
    }

    if (rangeText === null) {
      entry.status = "no-range";
      entry.issue = "No reference range was detected. No comparison was made.";
      return entry;
    }

    const cleanRangeText = rangeText.replace(reportRangePrefixPattern, "").trim();
    const rangeMatch = cleanRangeText.match(reportIntervalPattern);
    if (!rangeMatch) {
      entry.status = "invalid-range";
      entry.issue = "The supplied range was not a readable pair of numeric bounds. No comparison was made.";
      return entry;
    }

    const lower = Number(rangeMatch[1]);
    const upper = Number(rangeMatch[4]);
    const lowerUnit = rangeMatch[2] || rangeMatch[3] || "";
    const upperUnit = rangeMatch[5] || rangeMatch[6] || "";
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
      entry.status = "invalid-range";
      entry.issue = "The supplied range is invalid or its lower bound is above its upper bound. No comparison was made.";
      return entry;
    }

    if (lowerUnit && upperUnit && normalizeReportUnit(lowerUnit) !== normalizeReportUnit(upperUnit)) {
      entry.status = "unit-mismatch";
      entry.issue = "The range bounds use different units. No comparison was made.";
      return entry;
    }

    const rangeUnit = lowerUnit || upperUnit;
    if (Boolean(entry.resultUnit) !== Boolean(rangeUnit) || (
      entry.resultUnit && rangeUnit && normalizeReportUnit(entry.resultUnit) !== normalizeReportUnit(rangeUnit)
    )) {
      entry.status = "unit-mismatch";
      entry.issue = "The result and supplied range do not have matching units. No comparison or unit conversion was made.";
      return entry;
    }

    entry.lower = lower;
    entry.upper = upper;
    entry.rangeUnit = rangeUnit;
    entry.unitNote = entry.resultUnit
      ? reportUnitNotes.get(normalizeReportUnit(entry.resultUnit)) || ""
      : "";
    entry.status = entry.value < lower ? "below" : entry.value > upper ? "above" : "within";
    entry.issue = "This is only a numeric comparison with the supplied range.";
    return entry;
  }

  function getReportStatusLabel(status) {
    const labels = {
      below: "Below supplied range",
      within: "Within supplied range",
      above: "Above supplied range",
      "no-range": "No comparison",
      "invalid-range": "Range not interpreted",
      "unit-mismatch": "Units do not match",
      "unreadable-result": "Result not interpreted"
    };
    return labels[status] || "Not interpreted";
  }

  function getReportEntryExplanation(entry) {
    const lines = [
      entry.label,
      `Entered result: ${entry.resultText || "(no result text)"}`,
      `Entered reference range: ${entry.rangeText === null ? "none detected" : entry.rangeText}`,
      `Explanation: ${getReportStatusLabel(entry.status)}. ${entry.issue}`
    ];
    if (entry.termNote) lines.push(`Term note: ${entry.termNote}`);
    if (entry.unitNote) lines.push(`Unit note: ${entry.unitNote}.`);
    return lines.join("\n");
  }

  function renderReportEntry(entry) {
    const item = document.createElement("li");
    item.className = "report-result-card";

    const heading = document.createElement("h4");
    heading.textContent = entry.label;
    item.append(heading);

    const details = document.createElement("dl");
    details.className = "report-result-details";
    const resultTerm = document.createElement("dt");
    resultTerm.textContent = "Entered result";
    const resultValue = document.createElement("dd");
    resultValue.textContent = entry.resultText || "No result text supplied";
    const rangeTerm = document.createElement("dt");
    rangeTerm.textContent = "Entered reference range";
    const rangeValue = document.createElement("dd");
    rangeValue.textContent = entry.rangeText === null ? "None detected" : entry.rangeText || "No bounds supplied";
    details.append(resultTerm, resultValue, rangeTerm, rangeValue);
    item.append(details);

    const comparison = document.createElement("p");
    comparison.className = "report-comparison";
    const status = document.createElement("strong");
    status.textContent = getReportStatusLabel(entry.status);
    const explanation = document.createElement("span");
    explanation.textContent = entry.issue;
    comparison.append(status, explanation);
    item.append(comparison);

    if (entry.termNote) {
      const termNote = document.createElement("p");
      termNote.className = "report-term-note";
      termNote.textContent = entry.termNote;
      item.append(termNote);
    }

    if (entry.unitNote) {
      const unitNote = document.createElement("p");
      unitNote.className = "report-term-note";
      unitNote.textContent = `Unit note: ${entry.unitNote}.`;
      item.append(unitNote);
    }

    return item;
  }

  if (
    doctorFinderForm && doctorSpecialtyInput && doctorLocationInput && doctorSearchStatus &&
    doctorSearchClearButton && doctorSearchResults && doctorSearchPreview && doctorGoogleLink && doctorBingLink
  ) {
    function clearDoctorSearchResults() {
      doctorSearchResults.hidden = true;
      doctorSearchPreview.textContent = "";
      doctorGoogleLink.removeAttribute("href");
      doctorBingLink.removeAttribute("href");
    }

    function validateDoctorSearchField(input, label) {
      const value = input.value.trim();
      let errorMessage = "";

      if (!value) {
        errorMessage = `Enter a ${label}.`;
      } else if (value.length > input.maxLength) {
        errorMessage = `${label[0].toUpperCase()}${label.slice(1)} must be ${input.maxLength} characters or fewer.`;
      } else if (/[\u0000-\u001F\u007F]/.test(value)) {
        errorMessage = `Remove control characters from the ${label} field.`;
      }

      input.setCustomValidity(errorMessage);
      if (errorMessage) {
        input.setAttribute("aria-invalid", "true");
        return null;
      }

      input.removeAttribute("aria-invalid");
      return value;
    }

    [doctorSpecialtyInput, doctorLocationInput].forEach((input) => {
      input.addEventListener("input", () => {
        const hadSearchLinks = !doctorSearchResults.hidden;
        const wasInvalid = input.getAttribute("aria-invalid") === "true";
        input.setCustomValidity("");
        input.removeAttribute("aria-invalid");
        clearDoctorSearchResults();
        if (hadSearchLinks) {
          doctorSearchStatus.textContent = "Search details changed. The old links were cleared; prepare new links to use the updated terms.";
        } else if (wasInvalid) {
          doctorSearchStatus.textContent = "";
        }
      });
    });

    doctorFinderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const specialty = validateDoctorSearchField(doctorSpecialtyInput, "specialty");
      const location = validateDoctorSearchField(doctorLocationInput, "location");

      if (!specialty || !location) {
        doctorSearchStatus.textContent = "Enter both a specialty and a city or postal/PIN code to prepare search links.";
        const firstInvalidField = !specialty ? doctorSpecialtyInput : doctorLocationInput;
        firstInvalidField.focus();
        firstInvalidField.reportValidity();
        return;
      }

      const query = `${specialty} doctor ${location}`;
      const encodedQuery = encodeURIComponent(query);
      doctorGoogleLink.href = `https://www.google.com/search?q=${encodedQuery}`;
      doctorBingLink.href = `https://www.bing.com/search?q=${encodedQuery}`;
      doctorSearchPreview.textContent = `Search terms: ${query}`;
      doctorSearchResults.hidden = false;
      doctorSearchStatus.textContent = "Search links are ready. CareGuide has not sent anything. Choose a provider link to send these terms to that external service.";
    });

    doctorSearchClearButton.addEventListener("click", () => {
      doctorFinderForm.reset();
      doctorSpecialtyInput.setCustomValidity("");
      doctorLocationInput.setCustomValidity("");
      doctorSpecialtyInput.removeAttribute("aria-invalid");
      doctorLocationInput.removeAttribute("aria-invalid");
      clearDoctorSearchResults();
      doctorSearchStatus.textContent = "Search fields and links cleared. Nothing was sent.";
      doctorSpecialtyInput.focus();
    });
  }

  if (
    reportForm && reportInput && reportInputStatus && clearReportInputButton && reportExplanation &&
    reportResults && copyReportExplanationButton && reportCopyStatus
  ) {
    let reportExplanationText = "";
    const maxReportLines = 100;

    reportInput.addEventListener("input", () => {
      reportInput.removeAttribute("aria-invalid");
      reportResults.replaceChildren();
      reportExplanation.hidden = true;
      reportExplanationText = "";
      copyReportExplanationButton.disabled = true;
      reportCopyStatus.textContent = "";
      clearReportInputButton.disabled = reportInput.value.length === 0;
      reportInputStatus.textContent = reportInput.value.trim()
        ? "Input changed. Explain the current text again to refresh the local result."
        : "";
    });

    reportForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const reportText = reportInput.value;

      if (!reportText.trim()) {
        reportInput.setAttribute("aria-invalid", "true");
        reportInputStatus.textContent = "Paste or type report text before continuing.";
        reportInput.focus();
        return;
      }

      if (reportText.length > 12000) {
        reportInputStatus.textContent = "This input is too long. Process up to 12,000 characters at a time.";
        reportInput.focus();
        return;
      }

      const lines = reportText.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length > maxReportLines) {
        reportInputStatus.textContent = `Process up to ${maxReportLines} non-empty lines at a time.`;
        return;
      }

      reportInput.removeAttribute("aria-invalid");
      const entries = [];
      let unsupportedLines = 0;
      lines.forEach((line) => {
        const entry = parseReportLine(line.trim());
        if (entry) entries.push(entry);
        else unsupportedLines += 1;
      });

      reportResults.replaceChildren();
      reportExplanation.hidden = true;
      reportExplanationText = "";
      copyReportExplanationButton.disabled = true;
      reportCopyStatus.textContent = "";

      if (!entries.length) {
        reportInputStatus.textContent = "No supported result lines were found. Use one labeled result per line, such as the format shown above.";
        return;
      }

      entries.forEach((entry) => reportResults.append(renderReportEntry(entry)));
      reportExplanation.hidden = false;
      const explanationLines = [
        "CareGuide Medical Report Explainer",
        "Processed locally in this browser. No AI, upload, or external service was used.",
        "",
        ...entries.map((entry, index) => `${index + 1}. ${getReportEntryExplanation(entry)}`)
      ];
      if (unsupportedLines) explanationLines.push("", `${unsupportedLines} line(s) were outside the supported label-and-colon format and were skipped.`);
      explanationLines.push(
        "",
        "Reference ranges vary by laboratory and context. These comparisons do not diagnose a condition or establish that a result is safe or dangerous. Discuss unclear or concerning findings with a qualified healthcare professional."
      );
      reportExplanationText = explanationLines.join("\n");
      copyReportExplanationButton.disabled = false;
      reportInputStatus.textContent = `Processed ${entries.length} labeled line(s) locally.${unsupportedLines ? ` ${unsupportedLines} unsupported line(s) were skipped.` : ""} No report text was saved or transmitted.`;
    });

    clearReportInputButton.addEventListener("click", () => {
      reportInput.value = "";
      reportInput.removeAttribute("aria-invalid");
      reportInputStatus.textContent = "Input and explanation cleared from this page.";
      reportResults.replaceChildren();
      reportExplanation.hidden = true;
      reportExplanationText = "";
      copyReportExplanationButton.disabled = true;
      reportCopyStatus.textContent = "";
      clearReportInputButton.disabled = true;
      reportInput.focus();
    });

    copyReportExplanationButton.addEventListener("click", async () => {
      if (copyReportExplanationButton.disabled || !reportExplanationText) return;
      try {
        const copied = await copyText(reportExplanationText);
        reportCopyStatus.textContent = copied
          ? "Explanation copied to clipboard."
          : "Copy is unavailable here. Select the explanation and press Ctrl+C.";
      } catch (_error) {
        reportCopyStatus.textContent = "Copy is unavailable here. Select the explanation and press Ctrl+C.";
      }
    });
  }
})();
