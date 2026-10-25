# CareGuide AI

CareGuide AI is a browser-based educational healthcare assistant prototype. It helps people organize information for conversations with healthcare professionals. It does not connect to an AI service, provide diagnoses, or replace professional care.

## Features

- Overview dashboard with navigation and dark/light themes.
- Prepare for a Visit form with concern, duration, intensity, and an urgent-warning prompt.
- Optional voice input through the browser's speech-recognition API, where supported.
- Emergency Guidance with a reminder to contact local emergency services if there may be immediate danger.
- Visit Summary with copy, text download, and print options.
- Medical Report Explainer that uses a small local glossary and compares supported numeric results with ranges supplied in the text. It is not an AI report reader.
- Doctor Finder that creates external Google and Bing search links from a specialty and city or postal/PIN code. It has no verified doctor directory.
- Appointment Planner with downloadable text and calendar files. It does not book appointments or send reminders.
- Wellness Check-in with fixed items, personal goals, progress, a weekly overview, and optional browser-local saving.

## Technologies

- HTML
- CSS
- Vanilla JavaScript

The site has no build step, backend, framework, or required package dependencies.

## Run locally

Open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Stop the local server with `Ctrl+C` in the terminal.

## Privacy notes

- Visit details and pasted report text are handled in the page. CareGuide does not save them to its own browser storage or send them to an API. Summary and appointment files are created only when you choose an export option.
- The theme preference is saved in browser `localStorage`. Wellness goals and check-ins are saved there only after saving is enabled. Browser storage is associated with the browser profile and is not encrypted by this app; avoid putting highly sensitive details in wellness goals.
- Doctor Finder does not request device location or save search terms. Clicking a Google or Bing link sends the specialty and location in the search URL to that external service. CareGuide does not verify the resulting listings; check provider details independently.
- Voice Input depends on browser support and settings. The browser may process speech using its own recognition service, which may send audio outside the device. CareGuide does not send audio to its own server. Review your browser's privacy information before using voice input.

## Healthcare safety

CareGuide is an educational prototype. It does not diagnose conditions, recommend treatment or medication, or substitute for professional medical advice. The report explainer only compares supported numeric values with ranges supplied by the user; it cannot determine what a result means for an individual. The app does not screen for emergencies and is not a substitute for emergency services. If you may be in immediate danger, contact your local emergency services.
