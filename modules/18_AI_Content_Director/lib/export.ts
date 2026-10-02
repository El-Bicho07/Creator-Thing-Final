import { Project } from "./types";

export function exportToMarkdown(project: Project): string {
  let md = `# Production Package: ${project.title}\n\n`;
  md += `**Topic:** ${project.topic}\n`;
  md += `**Platform:** ${project.platform.toUpperCase()}\n`;
  md += `**Target Audience:** ${project.targetAudience}\n`;
  md += `**Target Duration:** ${project.targetDuration}\n`;
  md += `**Tone/Style:** ${project.tone}\n`;
  md += `**Language:** ${project.language}\n`;
  md += `**Generated Date:** ${new Date(project.updatedAt).toLocaleDateString()} ${new Date(project.updatedAt).toLocaleTimeString()}\n\n`;
  md += `---\n\n`;

  // Stage 1: Research
  if (project.research) {
    md += `## Stage 1: Research Briefing\n\n`;
    md += `### Executive Overview\n${project.research.topicOverview}\n\n`;
    md += `### Key Facts\n`;
    project.research.keyFacts.forEach((fact, i) => {
      md += `${i + 1}. ${fact}\n`;
    });
    md += `\n### Verified Statistics\n`;
    project.research.statistics.forEach((st) => {
      md += `- **${st.stat}:** ${st.context} *(Source: ${st.source || "Industry Report"})*\n`;
    });
    md += `\n### Key Trends\n`;
    project.research.trends.forEach((t) => {
      md += `- ${t}\n`;
    });
    md += `\n### Core Audience Pain Points\n`;
    project.research.audiencePainPoints.forEach((p) => {
      md += `- ${p}\n`;
    });
    md += `\n### Reference Sources\n`;
    project.research.sources.forEach((s) => {
      md += `- [${s.title}](${s.url}): ${s.snippet}\n`;
    });
    md += `\n---\n\n`;
  }

  // Stage 2: Angles
  if (project.angles) {
    md += `## Stage 2: Content Angles\n\n`;
    project.angles.angles.forEach((angle, i) => {
      const isSelected = angle.id === project.angles?.selectedAngleId ? " *(Selected Angle)*" : "";
      md += `### Angle ${i + 1}: ${angle.title}${isSelected}\n`;
      md += `> **Opening Hook:** "${angle.hook}"\n\n`;
      md += `- **Target Emotion:** ${angle.targetEmotion}\n`;
      md += `- **Production Difficulty:** ${angle.difficultyScore}/10 | **Uniqueness Score:** ${angle.uniquenessScore}/10\n`;
      md += `- **Thesis:** ${angle.description}\n`;
      md += `- **Audience Fit:** ${angle.targetAudienceFit}\n\n`;
    });
    md += `---\n\n`;
  }

  // Stage 3: Narrative
  if (project.narrative) {
    md += `## Stage 3: Narrative Architecture\n\n`;
    md += `**Framework:** ${project.narrative.framework}\n`;
    md += `**Core Theme:** ${project.narrative.coreTheme}\n`;
    md += `**Pacing Strategy:** ${project.narrative.targetPacing}\n`;
    md += `**Estimated Total Runtime:** ~${project.narrative.estimatedTotalMinutes} Minutes\n\n`;
    md += `### Beat-by-Beat Timeline\n\n`;
    project.narrative.beats.forEach((beat, i) => {
      md += `#### ${beat.act}: ${beat.beatTitle} (${beat.timing})\n`;
      md += `- **Beat Goal:** ${beat.goal}\n`;
      md += `- **Emotional Arc:** ${beat.emotionalArc}\n`;
      md += `- **Key Reveal/Point:** ${beat.keyPoint}\n\n`;
    });
    md += `---\n\n`;
  }

  // Stage 4: Script
  if (project.script) {
    md += `## Stage 4: Spoken Production Script\n\n`;
    md += `**Tone:** ${project.script.tone} | **Word Count:** ${project.script.totalWordCount} words | **Est. Runtime:** ${project.script.estimatedDurationFormatted}\n\n`;
    project.script.sections.forEach((sec) => {
      md += `### [${sec.sectionType.toUpperCase()}] ${sec.title} (~${sec.durationSec}s)\n`;
      md += `*Director's Delivery Note: ${sec.deliveryNotes}*\n\n`;
      md += `${sec.spokenText}\n\n`;
    });
    md += `---\n\n`;
  }

  // Stage 5: Visuals & B-roll
  if (project.visuals) {
    md += `## Stage 5: Visual & Audio Direction\n\n`;
    md += `**Overall Mood:** ${project.visuals.overallMood}\n`;
    md += `**Color Palette:** ${project.visuals.colorPaletteSuggestion}\n`;
    md += `**Music Pacing:** ${project.visuals.musicPacing}\n\n`;
    project.visuals.items.forEach((item) => {
      md += `### Section: ${item.sectionTitle}\n`;
      md += `- **On-Screen Visual:** ${item.onScreenVisuals}\n`;
      md += `- **B-Roll Cutaways:**\n`;
      item.bRollIdeas.forEach((b) => (md += `  - ${b}\n`));
      md += `- **Stock Footage Search Keywords:** ${item.stockKeywords.join(", ")}\n`;
      md += `- **Graphics & Overlays:**\n`;
      item.graphicsOverlays.forEach((g) => (md += `  - ${g}\n`));
      md += `- **Music / Sound Design:** ${item.musicMood}\n\n`;
    });
    md += `---\n\n`;
  }

  // Stage 6: Shot List
  if (project.shotList) {
    md += `## Stage 6: Production Shot List\n\n`;
    md += `**Total Shots:** ${project.shotList.totalShots} | **Estimated Shoot Time:** ${project.shotList.estimatedShootHours}\n`;
    md += `**Locations Required:** ${project.shotList.locationSummary.join(", ")}\n\n`;
    md += `| Shot # | Scene | Shot Type | Camera Movement | Location & Setup | Dialogue / VO Excerpt | Duration | Notes |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    project.shotList.shots.forEach((s) => {
      const cleanDialogue = s.dialogueVo.replace(/\|/g, "/").replace(/\n/g, " ");
      const cleanNotes = s.notes.replace(/\|/g, "/").replace(/\n/g, " ");
      md += `| ${s.shotNumber} | ${s.scene} | ${s.shotType} | ${s.cameraMovement} | ${s.locationSetup} | ${cleanDialogue} | ${s.duration} | ${cleanNotes} |\n`;
    });
    md += `\n---\n\n`;
  }

  // Stage 7: Publishing Copy
  if (project.publishing) {
    md += `## Stage 7: Publishing & Distribution Matrix\n\n`;
    md += `### Title Variations\n`;
    project.publishing.titleOptions.forEach((title, i) => {
      md += `${i + 1}. ${title}\n`;
    });
    md += `\n### SEO Description\n\`\`\`text\n${project.publishing.seoDescription}\n\`\`\`\n\n`;
    md += `### Hashtags & Tags\n`;
    md += `- **Hashtags:** ${project.publishing.hashtags.join(" ")}\n`;
    md += `- **Tags:** ${project.publishing.tags.join(", ")}\n\n`;
    md += `### Thumbnail Concepts\n`;
    project.publishing.thumbnailIdeas.forEach((t, i) => {
      md += `#### Concept ${i + 1}: "${t.mainText}"\n`;
      md += `- **Visual Focal Point:** ${t.visualConcept}\n`;
      md += `- **Color Contrast:** ${t.colorContrast}\n\n`;
    });
    md += `### Multi-Platform Captions\n\n`;
    md += `#### YouTube\n`;
    md += `**Title:** ${project.publishing.captions.youtube.title}\n\n`;
    md += `#### Instagram Reels\n`;
    md += `${project.publishing.captions.instagramReels.caption}\n\n`;
    md += `#### TikTok\n`;
    md += `**Caption:** ${project.publishing.captions.tiktok.caption}\n`;
    md += `**Sound Idea:** ${project.publishing.captions.tiktok.soundIdea}\n\n`;
    md += `#### LinkedIn Post\n`;
    md += `**Hook:** ${project.publishing.captions.linkedin.hook}\n\n`;
    md += `${project.publishing.captions.linkedin.postBody}\n\n`;
    md += `*Discussion:* ${project.publishing.captions.linkedin.callToDiscussion}\n\n`;
    md += `#### X (Twitter) Thread\n`;
    project.publishing.captions.x.thread.forEach((tweet, i) => {
      md += `**Tweet ${i + 1}:**\n${tweet}\n\n`;
    });
  }

  return md;
}

export function exportShotListToCSV(project: Project): string {
  if (!project.shotList || !project.shotList.shots.length) {
    return "Shot Number,Scene,Shot Type,Camera Movement,Location/Setup,Dialogue/VO Line,Duration,Notes,Status\n";
  }

  const headers = [
    "Shot Number",
    "Scene",
    "Shot Type",
    "Camera Movement",
    "Location/Setup",
    "Dialogue/VO Line",
    "Duration",
    "Notes",
    "Status"
  ];

  const rows = project.shotList.shots.map((shot) => {
    const escape = (str: string) => `"${(str || "").replace(/"/g, '""')}"`;
    return [
      shot.shotNumber,
      escape(shot.scene),
      escape(shot.shotType),
      escape(shot.cameraMovement),
      escape(shot.locationSetup),
      escape(shot.dialogueVo),
      escape(shot.duration),
      escape(shot.notes),
      shot.isCompleted ? "Completed" : "Pending"
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printProjectReport(project: Project) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  // Helper escape
  const esc = (str: string = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Format Date
  const dateStr = new Date(project.updatedAt || Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(project.title)} - Executive Production Package</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      padding: 32px;
      max-width: 1040px;
      margin: 0 auto;
    }

    /* Print toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 14px 20px;
      border-radius: 12px;
      margin-bottom: 28px;
    }
    .print-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
    }
    .print-btn:hover {
      background: #4338ca;
    }
    .print-hint {
      font-size: 13px;
      color: #64748b;
    }

    /* Document Header */
    .header-banner {
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #4f46e5;
      margin-bottom: 6px;
    }
    h1.project-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .topic-desc {
      font-size: 15px;
      color: #475569;
      margin-bottom: 16px;
    }

    /* Spec Grid */
    .spec-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 13px;
      margin-bottom: 32px;
    }
    .spec-item strong {
      color: #0f172a;
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .spec-item span {
      font-weight: 600;
      color: #1e293b;
    }

    /* Section Styling */
    .section-block {
      margin-bottom: 36px;
      page-break-inside: auto;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    h2.section-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e1b4b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stage-badge {
      font-size: 11px;
      font-weight: 700;
      background: #e0e7ff;
      color: #3730a3;
      padding: 3px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    /* Cards */
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .card-highlight {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
    }
    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    /* Statistics Grid */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 14px 0 20px 0;
    }
    .stat-box {
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 10px;
      padding: 14px;
    }
    .stat-number {
      font-size: 22px;
      font-weight: 800;
      color: #4f46e5;
      margin-bottom: 4px;
    }
    .stat-context {
      font-size: 12px;
      color: #334155;
      line-height: 1.4;
    }
    .stat-source {
      font-size: 10px;
      color: #64748b;
      margin-top: 6px;
      font-weight: 600;
    }

    /* Bullet Lists */
    ul.pro-list, ol.pro-list {
      padding-left: 20px;
      margin: 10px 0;
      font-size: 13.5px;
      color: #334155;
    }
    ul.pro-list li, ol.pro-list li {
      margin-bottom: 6px;
      line-height: 1.5;
    }

    /* Quotes & Callouts */
    .quote-box {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 14px;
      font-style: italic;
      color: #14532d;
      margin: 10px 0;
    }
    .delivery-cue {
      background: #fffbeb;
      border-left: 4px solid #d97706;
      padding: 8px 14px;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: #92400e;
      margin: 8px 0;
      font-weight: 500;
    }
    .dialogue-text {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      font-size: 14px;
      line-height: 1.65;
      color: #0f172a;
      margin-top: 8px;
    }

    /* Production Table */
    table.pro-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    table.pro-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    table.pro-table td {
      padding: 9px 12px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }
    table.pro-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .table-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: #e0e7ff;
      color: #3730a3;
    }

    /* Pill Tags */
    .tag-pill {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin: 2px 4px 2px 0;
      border: 1px solid #e2e8f0;
    }

    /* Two column grid */
    .two-col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Print media */
    @media print {
      body {
        padding: 0;
        max-width: 100%;
        color: #000000;
      }
      .no-print {
        display: none !important;
      }
      .spec-grid {
        background: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .section-block {
        page-break-inside: auto;
      }
      h2.section-title {
        page-break-before: auto;
      }
      .card {
        page-break-inside: avoid;
      }
      table.pro-table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Print Action Toolbar -->
  <div class="toolbar no-print">
    <div>
      <strong style="color: #0f172a; font-size: 15px;">Executive Production Dossier</strong>
      <div class="print-hint">Ready for print or direct "Save as PDF" via your browser print dialog</div>
    </div>
    <button onclick="window.print()" class="print-btn">Print / Save as PDF</button>
  </div>

  <!-- Header Banner -->
  <div class="header-banner">
    <div class="brand-tag">AI Content Director &bull; Studio Production Brief</div>
    <h1 class="project-title">${esc(project.title)}</h1>
    <div class="topic-desc">${esc(project.topic)}</div>

    <div class="spec-grid">
      <div class="spec-item">
        <strong>Platform & Format</strong>
        <span>${esc(project.platform.toUpperCase())}</span>
      </div>
      <div class="spec-item">
        <strong>Target Duration</strong>
        <span>${esc(project.targetDuration)}</span>
      </div>
      <div class="spec-item">
        <strong>Target Audience</strong>
        <span>${esc(project.targetAudience)}</span>
      </div>
      <div class="spec-item">
        <strong>Directing Tone</strong>
        <span style="text-transform: capitalize;">${esc(project.tone)}</span>
      </div>
      <div class="spec-item">
        <strong>Language</strong>
        <span>${esc(project.language)}</span>
      </div>
      <div class="spec-item">
        <strong>Package Generated</strong>
        <span>${esc(dateStr)}</span>
      </div>
    </div>
  </div>

  <!-- Stage 1: Research Briefing -->
  ${project.research ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 1: Research & Strategic Briefing</h2>
      <span class="stage-badge">Verified Intel</span>
    </div>

    <div class="card card-highlight">
      <div class="card-title">Executive Market Overview</div>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">${esc(project.research.topicOverview)}</p>
    </div>

    ${project.research.statistics && project.research.statistics.length > 0 ? `
    <div class="stats-row">
      ${project.research.statistics.map(st => `
        <div class="stat-box">
          <div class="stat-number">${esc(st.stat)}</div>
          <div class="stat-context">${esc(st.context)}</div>
          ${st.source ? `<div class="stat-source">Source: ${esc(st.source)}</div>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="two-col-grid">
      <div class="card">
        <div class="card-title" style="color: #4f46e5;">Core Factual Pillars</div>
        <ol class="pro-list">
          ${project.research.keyFacts.map(f => `<li>${esc(f)}</li>`).join('')}
        </ol>
      </div>

      <div class="card">
        <div class="card-title" style="color: #dc2626;">Audience Pain Points & Retention Leaks</div>
        <ul class="pro-list">
          ${project.research.audiencePainPoints.map(p => `<li>${esc(p)}</li>`).join('')}
        </ul>
      </div>
    </div>

    ${project.research.sources && project.research.sources.length > 0 ? `
    <div class="card" style="margin-top: 14px;">
      <div class="card-title">Reference Sources & Citation Links</div>
      <ul class="pro-list" style="margin-bottom: 0;">
        ${project.research.sources.map(s => `
          <li>
            <strong>${esc(s.title)}</strong> &mdash; 
            <span style="color: #475569;">${esc(s.snippet)}</span>
            <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #4f46e5;">${esc(s.url)}</div>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- Stage 2: Angles -->
  ${project.angles ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 2: Content Angles & Hooks</h2>
      <span class="stage-badge">Positioning</span>
    </div>

    ${project.angles.angles.map((a, i) => {
      const isSelected = a.id === project.angles?.selectedAngleId;
      return `
      <div class="card ${isSelected ? 'card-highlight' : ''}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="font-size: 15px; color: #0f172a;">#${i + 1}. ${esc(a.title)}</strong>
          <div>
            ${isSelected ? '<span class="stage-badge" style="background: #dcfce7; color: #15803d; margin-right: 6px;">Selected Angle</span>' : ''}
            <span class="stage-badge">${esc(a.targetEmotion)}</span>
          </div>
        </div>
        <div class="quote-box">&ldquo;${esc(a.hook)}&rdquo;</div>
        <p style="font-size: 13px; color: #475569; margin-bottom: 8px;">${esc(a.description)}</p>
        <div style="font-size: 12px; color: #334155; display: flex; gap: 16px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
          <span><strong>Uniqueness:</strong> ${a.uniquenessScore} / 10</span>
          <span><strong>Difficulty:</strong> ${a.difficultyScore} / 10</span>
          <span><strong>Audience Fit:</strong> ${esc(a.targetAudienceFit)}</span>
        </div>
      </div>
      `;
    }).join('')}
  </div>
  ` : ''}

  <!-- Stage 3: Narrative Architecture -->
  ${project.narrative ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 3: Narrative Architecture & Timeline</h2>
      <span class="stage-badge">Story Structure</span>
    </div>

    <div class="card card-highlight">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
        <span><strong>Framework:</strong> ${esc(project.narrative.framework)}</span>
        <span><strong>Pacing Strategy:</strong> ${esc(project.narrative.targetPacing)}</span>
        <span><strong>Est. Total Duration:</strong> ~${project.narrative.estimatedTotalMinutes} Min</span>
      </div>
      <div style="font-size: 14px; font-weight: 600; color: #1e1b4b;">
        &ldquo;${esc(project.narrative.coreTheme)}&rdquo;
      </div>
    </div>

    <table class="pro-table">
      <thead>
        <tr>
          <th style="width: 16%;">Act & Beat</th>
          <th style="width: 12%;">Timing</th>
          <th style="width: 24%;">Goal</th>
          <th style="width: 20%;">Emotional Arc</th>
          <th style="width: 28%;">Key Point</th>
        </tr>
      </thead>
      <tbody>
        ${project.narrative.beats.map(b => `
          <tr>
            <td><strong>${esc(b.act)}</strong><br/><span style="color: #4f46e5;">${esc(b.beatTitle)}</span></td>
            <td><span class="table-badge">${esc(b.timing)}</span></td>
            <td>${esc(b.goal)}</td>
            <td><em>${esc(b.emotionalArc)}</em></td>
            <td>${esc(b.keyPoint)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Stage 4: Spoken Production Script -->
  ${project.script ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 4: Spoken Production Script</h2>
      <span class="stage-badge">${project.script.totalWordCount} Words &bull; ${esc(project.script.estimatedDurationFormatted)}</span>
    </div>

    ${project.script.sections.map((sec, idx) => `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div class="card-title" style="margin-bottom: 0;">
            <span class="table-badge" style="text-transform: uppercase; margin-right: 6px;">${esc(sec.sectionType)}</span>
            ${idx + 1}. ${esc(sec.title)}
          </div>
          <span style="font-size: 12px; font-weight: 700; color: #64748b;">~${sec.durationSec}s</span>
        </div>

        <div class="delivery-cue">
          <strong>Director Delivery Cue:</strong> ${esc(sec.deliveryNotes)}
        </div>

        <div class="dialogue-text">
          ${esc(sec.spokenText)}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Stage 5: Visuals & B-Roll -->
  ${project.visuals ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 5: Visual & Audio Direction</h2>
      <span class="stage-badge">Cinematography</span>
    </div>

    <div class="card card-highlight">
      <div style="font-size: 13px; margin-bottom: 4px;">
        <strong>Visual Mood:</strong> ${esc(project.visuals.overallMood)}
      </div>
      <div style="font-size: 13px; margin-bottom: 4px;">
        <strong>Color Palette:</strong> ${esc(project.visuals.colorPaletteSuggestion)}
      </div>
      <div style="font-size: 13px;">
        <strong>Audio Pacing:</strong> ${esc(project.visuals.musicPacing)}
      </div>
    </div>

    ${project.visuals.items.map((item, idx) => `
      <div class="card">
        <div class="card-title">${idx + 1}. Section: ${esc(item.sectionTitle)}</div>
        
        <p style="font-size: 13px; color: #1e293b; margin-bottom: 8px;">
          <strong>On-Screen Framing:</strong> ${esc(item.onScreenVisuals)}
        </p>

        <div style="margin-bottom: 8px;">
          <strong style="font-size: 12px; color: #475569;">B-Roll Cutaways:</strong>
          <ul class="pro-list" style="margin: 4px 0 8px 0;">
            ${item.bRollIdeas.map(b => `<li>${esc(b)}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 8px;">
          <strong style="font-size: 12px; color: #475569;">Stock Footage Search Terms:</strong><br/>
          ${item.stockKeywords.map(kw => `<span class="tag-pill">${esc(kw)}</span>`).join('')}
        </div>

        ${item.graphicsOverlays && item.graphicsOverlays.length > 0 ? `
        <div style="margin-bottom: 8px;">
          <strong style="font-size: 12px; color: #475569;">Graphics & Overlays:</strong><br/>
          ${item.graphicsOverlays.map(g => `<span class="tag-pill" style="background: #eef2ff; color: #4338ca;">${esc(g)}</span>`).join('')}
        </div>
        ` : ''}

        <div style="font-size: 12px; color: #64748b; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
          <strong>Music Mood:</strong> ${esc(item.musicMood)}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Stage 6: Production Shot List -->
  ${project.shotList ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 6: Production Camera Shot List</h2>
      <span class="stage-badge">${project.shotList.totalShots} Shots &bull; ${esc(project.shotList.estimatedShootHours)}</span>
    </div>

    <div style="font-size: 13px; color: #475569; margin-bottom: 12px;">
      <strong>Locations Required:</strong> ${esc(project.shotList.locationSummary.join(", "))}
    </div>

    <table class="pro-table">
      <thead>
        <tr>
          <th style="width: 6%; text-align: center;">#</th>
          <th style="width: 14%;">Scene</th>
          <th style="width: 14%;">Type & Move</th>
          <th style="width: 18%;">Location / Setup</th>
          <th style="width: 24%;">Dialogue / Line</th>
          <th style="width: 8%; text-align: center;">Dur.</th>
          <th style="width: 16%;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${project.shotList.shots.map(s => `
          <tr>
            <td style="text-align: center; font-weight: 700; font-family: monospace;">${s.shotNumber}</td>
            <td><strong>${esc(s.scene)}</strong></td>
            <td><span class="table-badge">${esc(s.shotType)}</span><br/><small style="color: #64748b;">${esc(s.cameraMovement)}</small></td>
            <td>${esc(s.locationSetup)}</td>
            <td><em>&ldquo;${esc(s.dialogueVo)}&rdquo;</em></td>
            <td style="text-align: center; font-weight: 700;">${esc(s.duration)}</td>
            <td><small>${esc(s.notes)}</small></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Stage 7: Publishing Matrix -->
  ${project.publishing ? `
  <div class="section-block">
    <div class="section-header">
      <h2 class="section-title">Stage 7: Publishing & Distribution Matrix</h2>
      <span class="stage-badge">Multi-Platform</span>
    </div>

    <div class="card">
      <div class="card-title">5 High-Converting Title Variations</div>
      <ol class="pro-list">
        ${project.publishing.titleOptions.map(t => `<li><strong>${esc(t)}</strong></li>`).join('')}
      </ol>
    </div>

    <div class="card">
      <div class="card-title">SEO Description</div>
      <pre style="white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b;">${esc(project.publishing.seoDescription)}</pre>
    </div>

    <div class="two-col-grid" style="margin-bottom: 14px;">
      <div class="card">
        <div class="card-title">Viral Hashtags</div>
        <div>
          ${project.publishing.hashtags.map(h => `<span class="tag-pill" style="color: #4f46e5; font-weight: 700;">${esc(h)}</span>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Backend Search Tags</div>
        <div>
          ${project.publishing.tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Thumbnail Concepts</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px;">
        ${project.publishing.thumbnailIdeas.map((th, idx) => `
          <div style="background: #090d16; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; color: #ffffff;">
            <div style="font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;">Concept #${idx + 1}</div>
            <div style="font-size: 16px; font-weight: 800; color: #fde047; text-align: center; padding: 8px 0; border: 1px dashed #334155; margin-bottom: 10px; border-radius: 6px;">
              ${esc(th.mainText)}
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
              <strong>Visual:</strong> ${esc(th.visualConcept)}
            </div>
            <div style="font-size: 10px; color: #94a3b8;">
              <strong>Contrast:</strong> ${esc(th.colorContrast)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Multi-Platform Captions -->
    <div class="card">
      <div class="card-title">Multi-Platform Captions & Distribution Posts</div>
      
      <div style="margin-bottom: 14px;">
        <strong style="color: #e11d48; font-size: 13px;">Instagram Reels Caption:</strong>
        <p style="white-space: pre-wrap; font-size: 13px; color: #334155; background: #fff1f2; padding: 10px; border-radius: 6px; border: 1px solid #fecdd3; margin-top: 4px;">${esc(project.publishing.captions.instagramReels.caption)}</p>
      </div>

      <div style="margin-bottom: 14px;">
        <strong style="color: #0284c7; font-size: 13px;">LinkedIn Post:</strong>
        <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border: 1px solid #bae6fd; margin-top: 4px; font-size: 13px; color: #0c4a6e;">
          <p><strong>${esc(project.publishing.captions.linkedin.hook)}</strong></p>
          <p style="white-space: pre-wrap; margin: 8px 0;">${esc(project.publishing.captions.linkedin.postBody)}</p>
          <p><em>${esc(project.publishing.captions.linkedin.callToDiscussion)}</em></p>
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <strong style="color: #0f172a; font-size: 13px;">X (Twitter) Thread (${project.publishing.captions.x.thread.length} Tweets):</strong>
        <ol class="pro-list" style="margin-top: 6px;">
          ${project.publishing.captions.x.thread.map(tw => `<li>${esc(tw)}</li>`).join('')}
        </ol>
      </div>
    </div>
  </div>
  ` : ''}

  <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px;">
    AI Content Director &bull; End of Production Brief
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
